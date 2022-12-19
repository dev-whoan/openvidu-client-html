var OVCamera;
var OVScreen;
var sessionCamera;
var sessionScreen;

var userList = [];
var myUserName;
var mySessionId;
var isPreparingSession = true;
var sessionScreenOnline = false;
var screensharing = false;
var isMediaDialogShown = false;
var connectedToSession = false;
var isRecording = false;
var forceRecordingId = false;

const VIDEO_STREAMING_RESOLUTION = {
    width: 640,
    height: 480
}

const GRID_MAX_USER_COUNT = 4;

/*
    * To Do List
    - Prepare session: use click off, then let preview should be off
    - every player should be able to record. not only publisher.

    * Current Issue
    - Joining with turning off the camera, cannot turn on the camera.
    
    * Functional Requirements
    
*/

var TOOLBAR_ICON = {
    screen: {
        on: '/resource/img/toolbar/screen_share_on.png',
        off: '/resource/img/toolbar/screen_share_off.png'
    },
    camera: {
        on: '/resource/img/toolbar/camera_on.png',
        off: '/resource/img/toolbar/camera_off.png'
    },
    mic: {
        on: '/resource/img/toolbar/mic_on.png',
        off: '/resource/img/toolbar/mic_off.png'
    },
    setting: '/resource/img/toolbar/setting.png',
    recording: {
        download: '/resource/img/toolbar/video_save.png',
        on: 'record-start',
        off: 'record-stop'
    }
}

var myPublisher = {
    camera: null,
    screen: null,
}

const myDevices = {
    IS_MOBILE: isMobileDevice(),
    VIDEO_ELEMENT: {
        element: null,
        show: false,
    },
	CAMERA: {
		name: null,
		deviceId: null,
		track: null,
		stopped: false,
		forceStopped: false,
        hasChanged: false,
	},
	AUDIO: {
		name: null,
		deviceId: null,
		stopped: false,
	},
	MICROPHONE: {
		name: null,
		deviceId: null,
		stopped: false,
		forceStopped: false,
	},
}
const newCameraDevice = {
	name: null,
	deviceId: null,
	track: null,
	stopped: false
};
const newMicrophoneDevice = {
	name: null,
	deviceId: null,
	track: null,
	stopped: false
}

const SELECT_LIST = {
	CAMERA: "CAMERA",
	AUDIO: "AUDIO",
	MICROPHONE: "MICROPHONE"
}

const initSetting = {
    MICROPHONE: true,
    VIDEO: true,
}

const virtualCameraForBlackScreen = {
    mediaStream: null,
    deviceId: null,
    track: null,
    label: null,
    loop: null,
};
/* Before connect */

function preapare(){
	document.getElementById('section-media-devices').style.display = 'block';
	isMediaDialogShown = true;

    createVirtualCamera();
    initializeVideoDevice();
    initializeMicrophoneDevice();
}

function createVirtualCamera(){
    if(virtualCameraForBlackScreen.loop){
        clearTimeout(virtualCameraForBlackScreen.loop);
        virtualCameraForBlackScreen.loop = null;
    }

    let vCam = createEmptyMediaStream();
    vCam.getVideoTracks()[0].label = 'Virtual Camera';

    // GC
    virtualCameraForBlackScreen.mediaStream = null;
    virtualCameraForBlackScreen.track = null;
    virtualCameraForBlackScreen.deviceId = null;
    virtualCameraForBlackScreen.label = null;

    // New
    virtualCameraForBlackScreen.mediaStream = vCam;
    virtualCameraForBlackScreen.track = vCam.getVideoTracks()[0];
    virtualCameraForBlackScreen.deviceId = vCam.getVideoTracks()[0].id;
    virtualCameraForBlackScreen.label = vCam.getVideoTracks()[0].label;
}

function initCameraOff(){
    myDevices.CAMERA.stopped = true;
    myDevices.CAMERA.deviceId = virtualCameraForBlackScreen.deviceId;
    myDevices.CAMERA.track = virtualCameraForBlackScreen.track;
    myDevices.CAMERA.name = 'Virtual Camera';

    let previewer = document.getElementById('camera-preview');
    previewer.srcObject = virtualCameraForBlackScreen.mediaStream;
	
    initSetting.VIDEO = false;
}

function initMicrophoneOff(){   
    myDevices.MICROPHONE.stopped = true;
    initSetting.MICROPHONE = false;
}

async function initializeVideoDevice(){
    try{
        let devices = await navigator.mediaDevices.enumerateDevices();
        devices = devices.filter(device => device.kind === 'videoinput');

        if(devices && devices.length > 0){
            appendSelectList(devices, devices[0].label, SELECT_LIST.CAMERA);
            onchangeCameraSelectList(true);
            myDevices.CAMERA.deviceId = devices[0].deviceId;
            myDevices.CAMERA.name = devices[0].label;
            navigator.mediaDevices.getUserMedia({
                video: {
                    exact: {
                        deviceId: myDevices.CAMERA.deviceId
                    }
                }
            }).then( (mediaStream) => {
                myDevices.CAMERA.track = mediaStream.getVideoTracks();
            });

            return;
        }
        console.warn("No camera device found");
        initSetting.NO_CAMERA_DEVICE = true;
        myDevices.CAMERA.deviceId = virtualCameraForBlackScreen.deviceId;
        myDevices.CAMERA.track = virtualCameraForBlackScreen.track;
        myDevices.CAMERA.name = virtualCameraForBlackScreen.label;
        
        document.getElementById('buttonStopCamera').disabled = true;
        return;
    } catch (e) {
        console.error(e);
        if(e.message.includes("device not found"))  console.warn("No camera device found");
        initSetting.NO_CAMERA_DEVICE = true;
        myDevices.CAMERA.deviceId = virtualCameraForBlackScreen.deviceId;
        myDevices.CAMERA.track = virtualCameraForBlackScreen.track;
        myDevices.CAMERA.name = virtualCameraForBlackScreen.label;
        document.getElementById('buttonStopCamera').disabled = true;
        return;
    }
}

async function initializeMicrophoneDevice(){
    try{
        let devices = await navigator.mediaDevices.enumerateDevices();
        devices = devices.filter(device => device.kind === 'audioinput');
        
        if(devices && devices.length > 0){
            appendSelectList(devices, devices[0].label, SELECT_LIST.MICROPHONE);
            onchangeMicrophoneSelectList(true);
            myDevices.MICROPHONE.deviceId = devices[0].deviceId;
            myDevices.MICROPHONE.name = devices[0].label;
            
            return;
        }
        console.warn("No Audio Input device found");
        initSetting.NO_MICROPHONE_DEVICE = true;
        
        document.getElementById('buttonStopMicrophone').disabled = true;
        return;
    } catch (e) {
        if(e.message.includes("device not found"))  console.warn("No audio input device found");
        let t = await navigator.mediaDevices.enumerateDevices();
        initSetting.NO_MICROPHONE_DEVICE = true;
        document.getElementById('buttonStopMicrophone').disabled = true;
        return;
    }
}

function connectToSession(){
    if(!myDevices.CAMERA.track){
        alert("먼저 카메라를 선택해 주세요.");
        return;
    }

    document.getElementById('section-media-devices').style.display = 'none';
    document.getElementById('buttonConnectToSession').style.display = 'none';
    document.getElementById('buttonInitCameraOff').outerHTML = '';
    document.getElementById('buttonInitMicOff').outerHTML = '';
    isMediaDialogShown = false;

    document.getElementById('header').style.height = '0';
    
    joinSession();
    isPreparingSession = false;
}

/* Before connect */

/* OPENVIDU METHODS */

function joinSession() {

	mySessionId = document.getElementById("sessionId").value;
	myUserName = document.getElementById("userName").value;

	// --- 1) Get an OpenVidu object ---

	OVCamera = new OpenVidu();
    OVScreen = new OpenVidu();

	// --- 2) Init a session ---

	sessionCamera = OVCamera.initSession();
    sessionScreen = OVScreen.initSession();

    // --- 3) Specify the actions when events of type 'streamCreated' take
	// --- place in the session. The reason why we're using two different objects
	// --- is to handle diferently the subscribers when it is of 'CAMERA' type, or 'SCREEN' type ---

	// ------- 3.1) Handle subscribers of 'CAMERA' type
	sessionCamera.on('streamCreated', event => {
		if (event.stream.typeOfVideo == "CAMERA" || event.stream.typeOfVideo == 'CUSTOM') {
			// Subscribe to the Stream to receive it. HTML video will be appended to element with 'container-cameras' id
            let cameraHolder = createHTMLElement('div', ['one-video']);
            let cameraHolderWrapper = document.getElementById('camera-holder');
            cameraHolderWrapper.append(cameraHolder);

			var subscriber = sessionCamera.subscribe(event.stream, cameraHolder);
            
            userList.push(subscriber);
            toggleUserSection();
			// When the HTML video has been appended to DOM...
			subscriber.on('videoElementCreated', event => {
				// Add a new <p> element for the user's nickname just below its video
				appendUserData(event.element, subscriber.stream.connection);
                cameraHolder.id = `parent-${subscriber.stream.connection.connectionId}`;
			});
		}
	});

    // ------- 3.2) Handle subscribers of 'Screen' type
    
    sessionScreen.on('streamCreated', event => {
        console.log('sessionScreen.streamCreated', event)
		if (event.stream.typeOfVideo == "SCREEN") {
            sessionScreenOnline = true;
            let screenHolder = createHTMLElement('div', ['one-video']);
            let screenHolderWrapper = document.getElementById('screen-share-holder');
            screenHolderWrapper.append(screenHolder);
			// Subscribe to the Stream to receive it. HTML video will be appended to element with 'container-screens' id
			var subscriberScreen = sessionScreen.subscribe(event.stream, screenHolder);
			// When the HTML video has been appended to DOM...
			subscriberScreen.on('videoElementCreated', event => {
				// Add a new <p> element for the user's nickname just below its video
                createSharedScreen(event);
			});
            toggleUserSection();
		}
	});

    createSharedScreen = (event) => {
        if(!event.element.srcObject){
            setTimeout( () => {
                createSharedScreen(event);
            }, 300);
            return;
        }

        let mainVideo = $('#main-video video').get(0);
        console.log("=========screen created", event.element.srcObject);
        if (mainVideo.srcObject !== event.element.srcObject) {
            mainVideo.srcObject = event.element.srcObject;
        }
        appendUserData(event.element, subscriberScreen.stream.connection);
        return;
    }

	// On every Stream destroyed...
	sessionCamera.on('streamDestroyed', event => {
		// Delete the HTML element with the user's nickname. HTML videos are automatically removed from DOM
        if(event.stream.typeOfVideo === 'SCREEN'){
            sessionScreenOnline = false;   
        }
        userList = userList.filter( (subscribe) => subscribe.stream.streamId !== event.stream.streamId );
        
        toggleUserSection();

		removeUserData(event.stream.connection);
	});

	// On every asynchronous exception...
	sessionCamera.on('exception', (exception) => {
		console.warn(exception);
	});

    // Recording

    sessionCamera.on('recordingStarted', event => {
        isRecording = true;
        checkBtnsRecordings(isRecording);
        alert("현재 미팅은 녹화중입니다.");
        forceRecordingId = event.id;
        pushEvent(event);
    });

    sessionCamera.on('recordingStopped', event => {
        isRecording = false;
        checkBtnsRecordings(isRecording);
        alert("녹화가 종료되었습니다.");
        forceRecordingId = null;
        pushEvent(event);
    });

    // Recording

	// --- 4) Connect to the session with two different tokens: one for the camera and other for the screen ---

	// --- 4.1) Get the token for the 'sessionCamera' object
	getToken(mySessionId, false).then(token => {
		// First param is the token got from the OpenVidu deployment. Second param can be retrieved by every user on event
		// 'streamCreated' (property Stream.connection.data), and will be appended to DOM as the user's nickname
		sessionCamera.connect(token, { clientData: myUserName })
			.then(() => {
				// --- 5) Set page layout for active call ---
				document.getElementById('session-title').innerText = mySessionId;
				document.getElementById('join').style.display = 'none';
				document.getElementById('session').style.display = 'block';

				// --- 6) Get your own camera stream with the desired properties ---
                var publisher = null;
                
                let cameraHolder = createHTMLElement('div', ['one-video']);
                let cameraHolderWrapper = document.getElementById('camera-holder');
                cameraHolderWrapper.append(cameraHolder);

                if(initSetting.NO_CAMERA_DEVICE || initSetting.NO_MICROPHONE_DEVICE){
                    createVirtualCamera();
                    let constraint = {
                        audioSource: initSetting.NO_MICROPHONE_DEVICE ? null : undefined,
                        videoSource: initSetting.NO_CAMERA_DEVICE ? virtualCameraForBlackScreen.track : undefined,
                        publishAudio: initSetting.NO_MICROPHONE_DEVICE ? true : true,
                        publishVideo: initSetting.NO_CAMERA_DEVICE ? false : true,
                        insertMode: 'APPEND'
                    };

                    publisher = OVCamera.initPublisher(cameraHolder, constraint);                    
                } else {
                    publisher = OVCamera.initPublisher(cameraHolder, {
                        audioSource: undefined, // The source of audio. If undefined default microphone
                        videoSource: myDevices.CAMERA.track ? myDevices.CAMERA.track : undefined, // The source of video. If undefined default webcam
                        publishAudio: initSetting.MICROPHONE,  	// Whether you want to start publishing with your audio unmuted or not
                        publishVideo: true,  	// Whether you want to start publishing with your video enabled or not
//                        resolution: '640x480',  // The resolution of your video
                        frameRate: 30,			// The frame rate of your video
                        insertMode: 'APPEND',	// How the video is inserted in the target element 'container-cameras'
                        mirror: false       	// Whether to mirror your local video or not
                    });
                }
				// --- 7) Specify the actions when events take place in our publisher ---

				// When our HTML video has been added to DOM...
				publisher.on('videoElementCreated', function (event) {
                    toggleUserSection();
//					initMainVideo(event.element, myUserName);
                    myDevices.VIDEO_ELEMENT.element = event.element;
                    if(myDevices.VIDEO_ELEMENT.show){
                        myDevices.VIDEO_ELEMENT.element.parentNode.style.display = 'block';
                    } else {
                        myDevices.VIDEO_ELEMENT.element.parentNode.style.display = 'none';
                    }
                    
					appendUserData(event.element, myUserName);
					event.element['muted'] = true;
				});

                // Recording
                publisher.on('accessAllowed', event => {
					pushEvent({
						type: 'accessAllowed'
					});
				});

				publisher.on('accessDenied', event => {
					pushEvent(event);
				});

				publisher.on('accessDialogOpened', event => {
					pushEvent({
						type: 'accessDialogOpened'
					});
				});

				publisher.on('accessDialogClosed', event => {
					pushEvent({
						type: 'accessDialogClosed'
					});
				});
                // Recording

				// --- 8) Publish your stream ---

				sessionCamera.publish(publisher);
                myPublisher.camera = publisher;

			})
			.catch(error => {
				console.log('There was an error connecting to the session:', error.code, error.message);
			});
	});

    // --- 4.2) Get the token for the 'sessionScreen' object
    
	getToken(mySessionId, true).then((tokenScreen) => {
		// Create a token for screen share
		sessionScreen.connect(tokenScreen, { clientData: `${myUserName}-screen` }).then(() => {
//			document.getElementById('buttonScreenShare').style.display = 'block';
            document.getElementById('buttonScreenShare').src = TOOLBAR_ICON.screen.on;
			console.log("Session screen connected");
		}).catch((error => {
			console.warn('There was an error connecting to the session for screen share:', error.code, error.message);
		}));
	});
}

async function initializeMyDevices(){
	let mediaStream = await new OpenVidu().getUserMedia({
		audioSource: undefined,
		videoSource: undefined
	});

	let ovTracks = mediaStream.getVideoTracks();

	if(ovTracks && ovTracks.length > 0){
		let cameraList = await navigator.mediaDevices.enumerateDevices();
		cameraList = cameraList.filter(device => device.kind === 'videoinput');
	
		if(!cameraList || cameraList.length < 1){
			return;
		}
	
		myDevices.CAMERA.track = ovTracks[0];
		myDevices.CAMERA.deviceId = cameraList[0].deviceId;
		myDevices.CAMERA.name = cameraList[0].label;
		myDevices.CAMERA.stopped = false;
	}
}

function toggleScreenShare(){
    if(screensharing){
        unpublishScreenShare();
        return;
    }

    if(sessionScreenOnline){
        alert("이미 스크린 공유가 진행중 입니다.");
        return;
    }
    publishScreenShare();
}

// --- 9) Function to be called when the 'Screen share' button is clicked
function publishScreenShare() {
	// --- 9.1) To create a publisherScreen set the property 'videoSource' to 'screen'
    let screenHolder = createHTMLElement('div', ['one-video']);
    let screenHolderWrapper = document.getElementById('screen-share-holder');
    screenHolderWrapper.append(screenHolder);
	var publisherScreen = OVScreen.initPublisher(screenHolder, { videoSource: "screen" });
    myPublisher.screen = publisherScreen;

	// --- 9.2) Publish the screen share stream only after the user grants permission to the browser
    publisherScreen.once('accessAllowed', (event) => {
        document.getElementById('buttonScreenShare').src = TOOLBAR_ICON.screen.off;
        screensharing = true;
        // If the user closes the shared window or stops sharing it, unpublish the stream
        publisherScreen.stream.getMediaStream().getVideoTracks()[0].addEventListener('ended', () => {
            sessionScreen.unpublish(publisherScreen);
            document.getElementById('buttonScreenShare').src = TOOLBAR_ICON.screen.on;
            screensharing = false;
            sessionScreenOnline = false;
        });
        sessionScreen.publish(publisherScreen);
        toggleUserSection();
    });

    publisherScreen.on('videoElementCreated', function (event) {
        let mainVideo = $('#main-video video').get(0);
		if (mainVideo.srcObject !== event.element.srcObject) {
            mainVideo.srcObject = event.element.srcObject;
		}
        appendUserData(event.element, sessionScreen.connection);
        event.element['muted'] = true;
    });

    publisherScreen.once('accessDenied', (event) => {
        if(event.message.includes("You can only screen share in desktop")){
            alert("화면 공유 기능은 데스크톱 환경에서만 가능합니다. 지원 브라우저 목록: [크롬, 파이어 폭스, 오페라, 사파리 (13버전 이상), 에지, 일렉트론]");
            console.error(event);
            return;
        }
        console.error("Access Denied: 화면 공유화 권한이 없습니다. 현재 실행중인 브라우저에 화면 공유 권한을 설정해 주세요.");
    });
}

function unpublishScreenShare(){
    if(!screensharing){ return; }

    sessionScreen.unpublish(myPublisher.screen);
    document.getElementById('buttonScreenShare').src = TOOLBAR_ICON.screen.on;
    screensharing = false;
}

function leaveSession() {
	// --- 10) Leave the session by calling 'disconnect' method over the Session object ---
	sessionScreen.disconnect();
	sessionCamera.disconnect();

	// Removing all HTML elements with user's nicknames.
	// HTML videos are automatically removed when leaving a Session
	removeAllUserData();

	// Back to 'Join session' page
	document.getElementById('join').style.display = 'block';
	document.getElementById('session').style.display = 'none';
	// Restore default screensharing value to false
	screensharing = false;
	location.reload();
}

window.onbeforeunload = function () {
	if (sessionCamera) sessionCamera.disconnect();
	if (sessionScreen) sessionScreen.disconnect();
};


/* APPLICATION SPECIFIC METHODS */

window.addEventListener('load', function () {
	generateParticipantInfo();
});

function generateParticipantInfo() {
	document.getElementById("sessionId").value = "SessionA";
	document.getElementById("userName").value = "Participant" + Math.floor(Math.random() * 100);
}

function appendUserData(videoElement, connection) {
    var userData;
	var nodeId;
	if (typeof connection === "string") {
		userData = connection;
		nodeId = connection;
	} else {
        //"{\"clientData\":\"Participant83\"}%/%{\"openviduCustomConnectionId\":\"Participant83\"}"
        let connectionData = connection.data.split("%/%");
        for(let i = 0; i < connectionData.length; i++){
            if(!connectionData[i].includes("clientData"))   continue;
            let json = JSON.parse(connectionData[i]);
            if(json.clientData){
                userData = json.clientData;
                break;
            }
        }
//		userData = JSON.parse(connection.data).clientData;
		nodeId = connection.connectionId;
	}
	var dataNode = document.createElement('div');
	dataNode.className = "data-node";
	dataNode.id = "data-" + nodeId;
	dataNode.innerHTML = "<p>" + userData + "</p>";
	videoElement.parentNode.insertBefore(dataNode, videoElement.nextSibling);
	addClickListener(videoElement, userData);
}

function removeUserData(connection) {
	var dataNodeToRemove = document.getElementById("data-" + connection.connectionId);
    var parentNodeToRemove = document.getElementById(`parent-${connection.connectionId}`);
	if (dataNodeToRemove) {
		dataNodeToRemove.parentNode.removeChild(dataNodeToRemove);
	}
    
    if(parentNodeToRemove){
        parentNodeToRemove.remove();
    }
}

function removeAllUserData() {
	var nicknameElements = document.getElementsByClassName('data-node');
	while (nicknameElements[0]) {
		nicknameElements[0].parentNode.removeChild(nicknameElements[0]);
	}
}

function addClickListener(videoElement, userData) {
	videoElement.addEventListener('click', function () {
        if(!document.getElementById('camera-holder').classList.contains('camera-scroll-holder')){
            return;
        }
        if(screensharing || sessionScreenOnline){
            alert('화면 공유 중에는 사용자를 크게볼 수 없습니다.');
            return;
        }
		var mainVideo = $('#main-video video').get(0);
		if (mainVideo.srcObject !== videoElement.srcObject) {
			$('#main-video').fadeOut("fast", () => {
				$('#main-video p').html(userData);
				mainVideo.srcObject = videoElement.srcObject;
				$('#main-video').fadeIn("fast");
			});
		}
	});
}

function initMainVideo(videoElement, userData) {
	document.querySelector('#main-video video').srcObject = videoElement.srcObject;
	document.querySelector('#main-video p').innerHTML = userData;
	document.querySelector('#main-video video')['muted'] = true;
}

/**
 * 
 * The methods below change use camera sections into grid or scroll.
 * If more than 4 users are connected, will use scroll.
 * If screen sharing is connected, will use scroll.
 */

async function toggleUserSection(){
    let grid = true;
    //user count > 4 ? grid = true;
    if(userList.length + 1 > GRID_MAX_USER_COUNT){
        grid = false;
    } else if(screensharing || sessionScreenOnline){
        grid = false;
    }
    
    if(grid){
        gridingCameraSection();
        return;
    }

    scrollingCameraSection();
}

function gridingCameraSection(){
    let target = document.getElementById('camera-holder');
    let mainScreen = document.getElementById('main-video');
    if(!target){
        return;
    }

    if(target.classList.contains('camera-scroll-holder'))
        target.classList.remove('camera-scroll-holder');
    if(!target.classList.contains('camera-grid-holder'))
        target.classList.add('camera-grid-holder');

    mainScreen.style.display = 'none';
}

function scrollingCameraSection(){
    let target = document.getElementById('camera-holder');
    let mainScreen = document.getElementById('main-video');
    if(!target){
        return;
    }
    
    if(target.classList.contains('camera-grid-holder'))
        target.classList.remove('camera-grid-holder');
    if(!target.classList.contains('camera-scroll-holder'))
        target.classList.add('camera-scroll-holder');

    mainScreen.style.display = 'block';
}

/**
 * --------------------------------------------
 * CHANGING MEDIA DEVICE: CAMERA, SPEAKER
 * --------------------------------------------
 * The methods below allow client to change media devices.
 * To turn on or off, 
 */

function showMediaDevices(){
    let dialog = document.getElementById('section-media-devices');
    if(isPreparingSession){
        dialog.style.display = 'none';
		isMediaDialogShown = false;
		return;
    }
	
	if(isMediaDialogShown){
		if(!myDevices.CAMERA.stopped){
			myDevices.CAMERA.stopped = true;
			toggleCamera();
		}
		if(!myDevices.MICROPHONE.stopped){
			myDevices.MICROPHONE.stopped = true;
			toggleMicrophone();
		}
		dialog.style.display = 'none';
		isMediaDialogShown = false;
		return;
	}

	toggleCamera(true);
	toggleMicrophone(true);
	dialog.style.display = 'block';
	isMediaDialogShown = true;

	setCameraDeviceList();
	setMicrophoneDeviceList();
	setMyCameraTrack();
}

async function setMyCameraTrack(){
	if(myDevices.CAMERA.track){
		return;
	}

    let constraint = {
        video: {
            deviceId: {
                exact: myDevices.CAMERA.deviceId
            }
        }
    };
    
    let mediaStream = await navigator.mediaDevices.getUserMedia(constraint);
	let track = mediaStream.getVideoTracks();
	
	if(!track || track.length < 1){
        if(!isPrepareToJoin){
            alert("Fail to turn on the camera. Please check stauts of your camera.")
		    return;
        }
		
        myDevices.CAMERA.track = virtualCameraForBlackScreen.track;
        return;
	}

	myDevices.CAMERA.track = track[0];
}

async function toggleCamera(force){
    if(initSetting.NO_CAMERA_DEVICE){
        myDevices.CAMERA.stopped = true;
        document.getElementById('buttonStopCamera').src = TOOLBAR_ICON.camera.off;
        return;
    }
    
	if(force){
		try{
            createVirtualCamera();
            let _oldTrack = myPublisher.camera.stream.mediaStream.id;
            let _track = virtualCameraForBlackScreen.track;
			let changed = await myPublisher.camera.replaceTrack(_track);
            let _newTrack = myPublisher.camera.stream.mediaStream.id;

            // Ensure that camera turned off
            if(_oldTrack === _newTrack){
                createEmptyVideoTrack({width: VIDEO_STREAMING_RESOLUTION.width, height: VIDEO_STREAMING_RESOLUTION.height});
            }
			return;
		} catch (e) {
			console.error(e);
			return;
		}
	}
    
    if(myDevices.CAMERA.name === 'Virtual Camera'){
        alert("먼저 설정 탭에서 화상 카메라를 설정해 주세요.");
        return;
    }

	if(!myDevices.CAMERA.stopped){
		try{
            createVirtualCamera();
            let _oldTrack = myPublisher.camera.stream.mediaStream.id;
            let _track = virtualCameraForBlackScreen.track;
			let changed = await myPublisher.camera.replaceTrack(_track);
            let _newTrack = myPublisher.camera.stream.mediaStream.id;

            // Ensure that camera turned off
            if(_oldTrack === _newTrack){
                createEmptyVideoTrack({width: VIDEO_STREAMING_RESOLUTION.width, height: VIDEO_STREAMING_RESOLUTION.height});
            }
			myDevices.CAMERA.stopped = true;
            document.getElementById('buttonStopCamera').src = TOOLBAR_ICON.camera.off;
			return;
		} catch (e) {
			alert("Fail to turn off the camera. Please try it later.");
			return;
		}
	}
	
	if(myDevices.CAMERA.stopped){
		let mediaStream = await navigator.mediaDevices.getUserMedia({
			video: {
				deviceId: {
				  exact: myDevices.CAMERA.deviceId
				}
			}
		});
	
		let track = mediaStream.getVideoTracks();
	
		if(!track || track.length < 1){
			alert("Fail to turn on the camera. Please check stauts of your camera.")
			return;
		}
	
		try{
			let changed = await myPublisher.camera.replaceTrack(track[0]);	
			myDevices.CAMERA.stopped = false;
            document.getElementById('buttonStopCamera').src = TOOLBAR_ICON.camera.on;
			return;	
		} catch (e) {
			alert("Fail to turn on the camera. Please try it later.");
			return;
		}
	}
}

async function toggleMicrophone(force){
	if(force)	{
		try{
			myPublisher.camera.publishAudio(false);
			return;
		} catch (e) {
			console.log(e);
			return;
		}
	}

	if(!myDevices.MICROPHONE.stopped){
		try{
			myPublisher.camera.publishAudio(false);
			myDevices.MICROPHONE.stopped = true;
            document.getElementById('buttonStopMicrophone').src = TOOLBAR_ICON.mic.off;
			return;
		} catch (e) {
			alert("Fail to turn off the Microphone. Please try it later.");
			console.log(e);
			return;
		}
	}

	try{
		myPublisher.camera.publishAudio(true);
		myDevices.MICROPHONE.stopped = false;
        document.getElementById('buttonStopMicrophone').src = TOOLBAR_ICON.mic.on;
		return;	
	} catch (e) {
		alert("Fail to turn on the Microphone. Please try it later.");
		return;
	}
}

async function setCameraDeviceList(){
	let currentDevice;
	if(!myDevices.CAMERA.name){
		let mediaStream = await new OpenVidu().getUserMedia({
			audioSource: undefined,
			videoSource: undefined
		});

		let tracks = mediaStream.getVideoTracks();
		currentDevice = (tracks && tracks.length > 0 ? tracks[0].label : null);
	} else {
		currentDevice = myDevices.CAMERA.name;
	}
	
	let devices = await new OpenVidu().getDevices();
	let videoDevices = devices.filter(i => i.kind === 'videoinput');

	appendSelectList(videoDevices, currentDevice, SELECT_LIST.CAMERA);
    if(videoDevices && videoDevices.length > 0) onchangeCameraSelectList();
}

async function onchangeCameraSelectList(){
	let deviceSelect = document.getElementById('camera-select-list');

    if(!deviceSelect || !deviceSelect.options || !deviceSelect.options[deviceSelect.selectedIndex])    return;
    
	let selectValue = deviceSelect.options[deviceSelect.selectedIndex].value;
	
	let cameraList = await navigator.mediaDevices.enumerateDevices();//
    
	cameraList = cameraList.filter(device => device.kind === 'videoinput' && device.label === selectValue);
    
	if(!cameraList || cameraList.length < 1){
		alert(`Cannot find camera device with name[${selectValue}]. Please check the device's status.`);
		return;
	}
    
	let previewer = document.getElementById('camera-preview');

	newCameraDevice.deviceId = cameraList[0].deviceId;
	newCameraDevice.name = cameraList[0].label;
	newCameraDevice.stopped = false;

	navigator.mediaDevices.getUserMedia({
		video: {
			deviceId: {
			  exact: cameraList[0].deviceId
			}
		}
	}).then(
		(stream) => {
			previewer.srcObject = stream;
			previewer.addEventListener('canplaythrough', () => {
				previewer.play();
			});
		},
		err => console.error(err)
	)
}

async function changeCameraDevice(){
	if(newCameraDevice.deviceId == myDevices.CAMERA.deviceId){
		console.log('선택한 카메라로 이미 참여 중 입니다.')
		return;
	}

	myDevices.CAMERA.deviceId = newCameraDevice.deviceId;
	myDevices.CAMERA.name = newCameraDevice.name;
    myDevices.CAMERA.hasChanged = true;

	let mediaStream = await navigator.mediaDevices.getUserMedia({
		video: {
			deviceId: {
			  exact: myDevices.CAMERA.deviceId
			}
		}
	});
    console.log(mediaStream);

	let videoTrack = mediaStream.getVideoTracks()[0];

	/*
	myPublisher.camera.replaceTrack(videoTrack).then(() => {
		console.log("New track has been published")
	}).catch( (err) => {
		alert("Fail to turn off the camera. Please try it later.");
		console.error(err);
		return;
	});
	*/

	myDevices.CAMERA.track = videoTrack;
}

async function setMicrophoneDeviceList(){
	let mediaStream = await new OpenVidu().getUserMedia({
		audioSource: undefined,
		videoSource: undefined
	});

	let tracks = mediaStream.getAudioTracks();
	let currentDevice = (tracks && tracks.length > 0 ? tracks[0].label : null);

	let devices = await new OpenVidu().getDevices();
	let micDevices = devices.filter(i => i.kind === 'audioinput');

	appendSelectList(micDevices, currentDevice, SELECT_LIST.MICROPHONE);
    if(micDevices && micDevices.length > 0) onchangeMicrophoneSelectList();
}

async function onchangeMicrophoneSelectList(justCalled){
	let deviceSelect = document.getElementById('microphone-select-list');
    if(!deviceSelect)   return;
	let selectValue = deviceSelect.options[deviceSelect.selectedIndex].value;
	
	let micList = await navigator.mediaDevices.enumerateDevices();//
	micList = micList.filter(device => device.kind === 'audioinput' && device.label === selectValue);

	if(!micList || micList.length < 1){
		alert(`Cannot find microphone device with name[${selectValue}]. Please check the device's status.`);
		return;
	}

	newMicrophoneDevice.deviceId = micList[0].deviceId;
	newMicrophoneDevice.name = micList[0].label;
	newMicrophoneDevice.stopped = false;
}

async function changeMicrophoneDevice(){
	if(newMicrophoneDevice.deviceId == myDevices.MICROPHONE.deviceId){
		console.log('선택한 마이크로 이미 참여중 입니다.')
		return;
	}

	myDevices.MICROPHONE.deviceId = newMicrophoneDevice.deviceId;
	myDevices.MICROPHONE.name = newMicrophoneDevice.name;

	let mediaStream = await navigator.mediaDevices.getUserMedia({
		audio: {
			deviceId: {
			  exact: myDevices.MICROPHONE.deviceId
			}
		}
	});

	let audioTrack = mediaStream.getAudioTracks()[0];

	myPublisher.camera.replaceTrack(audioTrack).then(() => {
		console.log("New track has been published");
	}).catch( (err) => {
		alert("Fail to change audio input. Please try it later.");
		console.error(err);
		return;
	});

	myDevices.MICROPHONE.track = audioTrack;
}

async function setAudioDeviceList(){
	let mediaStream = await new OpenVidu().getUserMedia({
		audioSource: undefined,
		videoSource: undefined
	});

	let tracks = mediaStream.getAudioTracks();
	let currentDevice = (tracks && tracks.length > 0 ? tracks[0].label : null);

	let devices = await new OpenVidu().getDevices();
	let micDevices = devices.filter(i => i.kind === 'audiooutput');

	appendSelectList(micDevices, currentDevice, SELECT_LIST.MICROPHONE);
}

function appendSelectList(list, currentDevice, type){
	let parent;
	switch(type){
		case SELECT_LIST.CAMERA:
			parent = document.getElementById('camera-select-list');
			break;
		case SELECT_LIST.MICROPHONE:
			parent = document.getElementById('microphone-select-list');
			break;
		default:
			parent = document.getElementById('speaker-select-list');
	}

	if(!parent)	return;

	parent.innerHTML = '';

    
	list.forEach((device, index) => {
		let name = device.label;
		let deviceId = device.deviceId;
		let option = document.createElement('option');
		option.value = name;
		option.innerText = name;
		if(name === currentDevice) {
			option.selected = true;
			myDevices[type].name = name;
			myDevices[type].deviceId = deviceId;
		}
		parent.append(option);
	});
}

/**
 * --------------------------------------------
 * GETTING A TOKEN FROM YOUR APPLICATION SERVER
 * --------------------------------------------
 * The methods below request the creation of a Session and a Token to
 * your application server. This keeps your OpenVidu deployment secure.
 * 
 * In this sample code, there is no user control at all. Anybody could
 * access your application server endpoints! In a real production
 * environment, your application server must identify the user to allow
 * access to the endpoints.
 * 
 * Visit https://docs.openvidu.io/en/stable/application-server to learn
 * more about the integration of OpenVidu in your application server.
 */

let APPLICATION_SERVER_URL = '/'

async function getToken(mySessionId, isScreen, userName) {
    let sessionInfo = await createSession(mySessionId, isScreen, userName);
    let token = await createToken(mySessionId, isScreen, userName);
    return token;
//	return createSession(mySessionId).then(sessionId => createToken(sessionId));
}

/*
let sessionInfo = await getSessionInfo(mySessionId);
let jsonSessionInfo = JSON.parse(sessionInfo.sessionInfo);
console.log(jsonSessionInfo);
*/
function getSessionInfo(sessionId){
    return new Promise((resolve, reject) => {
        $.ajax({
            type: "GET",
            url: `${APPLICATION_SERVER_URL}sessions?sessionId=${sessionId}`,
            headers: { "Content-Type": "application/json"},
            success: response => resolve(response),
            error: (error) => reject(error)
        });
    })
}

function createSession(customSessionId, isScreen) {
	let _myUserName = (!isScreen) ?
         document.getElementById("userName").value // camera session
    :    document.getElementById("userName").value + '-screen' // screen session
    ;

    return new Promise((resolve, reject) => {
        $.ajax({
            type: "POST",
            url: APPLICATION_SERVER_URL + "sessions",
            data: JSON.stringify({ sessionId: customSessionId, nickname: _myUserName, screenSession: isScreen }),
            headers: { "Content-Type": "application/json" },
            success: response => resolve(response), // The sessionId
            error: (error) => reject(error)
        });
    });
}

function createToken(sessionId, isScreen) {
    let _myUserName = (!isScreen) ?
         document.getElementById("userName").value // camera session
    :    document.getElementById("userName").value + '-screen' // screen session
    ;
    return new Promise((resolve, reject) => {
        $.ajax({
            type: 'POST', 
			url: `${APPLICATION_SERVER_URL}sessions/${sessionId}/connection`,
//            url: APPLICATION_SERVER_URL + 'sessions/connection',
            data: JSON.stringify({ nickname: _myUserName, sessionId: sessionId, screenSession: isScreen }), // The sessionId and userNickname
            headers: { "Content-Type": "application/json" },
            success: (response) => resolve(response), // The token
            error: (error) => reject(error) 
        });
    });
}

/**
 * Recording Methods
 */

events = '';

function toggleRecord(){
    let button = document.getElementById('buttonRecord');
    if(button)  button.style.pointerEvents = 'none';
    if(isRecording){
        stopRecording(stopRecordingHandler, recordErrorHandler);
        isRecording = false;
        return;
    }

    startRecording(startRecordingHandler)
    isRecording = true;
}

function startRecordingHandler(response){
//    console.log(response);
//    send response.id to holder for let it know the recording files path   
//    document.getElementById('forceRecordingId').value = response.id;
    forceRecordingId = response.id;
    checkBtnsRecordings(true);
    $('#textarea-http').text(JSON.stringify(response, null, "\t"));

    let button = document.getElementById('buttonRecord');
    if(button)  button.style.pointerEvents = 'auto';
}

function stopRecordingHandler(response){
    console.log(response);
    $('#textarea-http').text(JSON.stringify(response, null, "\t"));
    checkBtnsRecordings(false);
    let button = document.getElementById('buttonRecord');
    if(button)  button.style.pointerEvents = 'auto';
    forceRecordingId = null;
}

function recordErrorHandler(error, message){
    console.warn(message + ' (' + error.status + ')');
    console.warn(error.responseText);
    let button = document.getElementById('buttonRecord');
    if(button)  button.style.pointerEvents = 'auto';
}

function httpRequest(method, url, body, errorMsg, callback) {
	console.log(`recording url: `, url);
	var http = new XMLHttpRequest();
	http.open(method, url, true);
	http.setRequestHeader('Content-type', 'application/json');
	http.addEventListener('readystatechange', processRequest, false);
    console.log(body);
	http.send(JSON.stringify(body));

	function processRequest() {
		if (http.readyState == 4) {
			if (http.status == 200) {
				try {
					callback(JSON.parse(http.responseText));
				} catch (e) {
					callback(e);
				}
			} else {
                recordErrorHandler(http, errorMsg);
			}
		}
	}
}

let recordingPrefixUri = ``;

function startRecording(callback) {
//    console.log(sessionCamera.sessionId);
	httpRequest(
		'POST',
        `${recordingPrefixUri}/recordings/start`, {
			sessionId: sessionCamera.sessionId,
			outputMode: "COMPOSED",
			hasAudio: true,
			hasVideo: true
		},
		'Start recording WRONG',
		res => {
			callback(res);
		}
	);
}

function stopRecording(callback, errorHandler) {
	httpRequest(
		'POST',
		`${recordingPrefixUri}/recordings/stop`, {
			recordingId: forceRecordingId,
            sessionId: sessionCamera.sessionId
		},
		'Stop recording WRONG',
		res => {
			callback(res);
		}
	);
}

function deleteRecording() {
	httpRequest(
		'DELETE',
		`${recordingPrefixUri}/recordings/delete/${forceRecordingId}`, {
			sessionId: sessionCamera.sessionId
		},
		'Delete recording WRONG',
		res => {
			console.log("DELETE ok");
			$('#textarea-http').text("DELETE ok");
		}
	);
}

function getRecording() {
	httpRequest(
		'GET',
		`${recordingPrefixUri}/recordings/get/` + forceRecordingId, {},
		'Get recording WRONG',
		res => {
			console.log(res);
			$('#textarea-http').text(JSON.stringify(res, null, "\t"));
		}
	);
}

function listRecordings() {
	httpRequest(
		'GET',
		`${recordingPrefixUri}/recordings`, {},
		'List recordings WRONG',
		res => {
			console.log(res);
			$('#textarea-http').text(JSON.stringify(res, null, "\t"));
		}
	);
}

function checkBtnsRecordings(onoff) {
    if(onoff){
        let button = document.getElementById('buttonRecord');
        if(button && button.classList.contains(TOOLBAR_ICON.recording.on))
            button.classList.remove(TOOLBAR_ICON.recording.on);
        button.classList.add(TOOLBAR_ICON.recording.off);

        return;
    }

    let button = document.getElementById('buttonRecord');
    if(button && button.classList.contains(TOOLBAR_ICON.recording.off))
        button.classList.remove(TOOLBAR_ICON.recording.off);
    button.classList.add(TOOLBAR_ICON.recording.on);
    
/*
	if (document.getElementById("forceRecordingId").value === "") {
		document.getElementById('buttonGetRecording').disabled = true;
		document.getElementById('buttonStopRecording').disabled = true;
		document.getElementById('buttonDeleteRecording').disabled = true;
	} else {
		document.getElementById('buttonGetRecording').disabled = false;
		document.getElementById('buttonStopRecording').disabled = false;
		document.getElementById('buttonDeleteRecording').disabled = false;
	}
*/
}

function pushEvent(event) {
	events += (!events ? '' : '\n') + event.type;
	$('#textarea-events').text(events);
}

function clearHttpTextarea() {
	$('#textarea-http').text('');
}

function clearEventsTextarea() {
	$('#textarea-events').text('');
	events = '';
}

/**
 * Recording Methods
 */

/**
 * Create Empty Media
 */

function createEmptyMediaStream(){
	return new MediaStream([createEmptyAudioTrack(), createEmptyVideoTrack({
            width: VIDEO_STREAMING_RESOLUTION.width,
            eight: VIDEO_STREAMING_RESOLUTION.height
        })
    ]);
}

function createEmptyAudioTrack(){
	const ctx = new AudioContext();
	const oscillator = ctx.createOscillator();
	const dst = oscillator.connect(ctx.createMediaStreamDestination());
	oscillator.start();
	const track = dst.stream.getAudioTracks()[0];
	return Object.assign(track, { enabled: false });
}

function createEmptyVideoTrack({width, height}){
	const canvas = document.getElementById('virtual-camera-canvas');//Object.assign(document.createElement('canvas'), { width, height });
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "#000000";
	ctx.fillRect(0, 0, width, height);

	const stream = canvas.captureStream();
	const track = stream.getVideoTracks()[0];
    
    let video = document.getElementById('virtual-camera');
    video.srcObject = stream;
    video.load();
    
    video.removeEventListener('click', () => {});
    video.addEventListener('play', () => {
        var loop = () => {
            if (!video.paused && !video.ended) {
                ctx.drawImage(video, 0, 0, 640, 480);
                virtualCameraForBlackScreen.loop = setTimeout(loop, 1000 / 10); // Drawing at 10 fps
            }
        };
        loop();
    });

    video.oncanplay = () => {
        video.play();
    }

	return Object.assign(track, { enabled: true });
}