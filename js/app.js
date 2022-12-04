var OVCamera;
var OVScreen;
var sessionCamera;
var sessionScreen;

var myUserName;
var mySessionId;
var screensharing = false;
var isMediaDialogShown = false;

var myPublisher = {
    camera: null,
    screen: null,
}

const myDevices = {
	CAMERA: {
		name: null,
		deviceId: null,
		track: null,
		stopped: false,
		forceStopped: false,
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

/* OPENVIDU METHODS */

/*
    Reason why camera doesn't appear
    1. User are connecting with same id to both session; camera, screen.
    2. When user connected, if screen entered first, then there is nothing to stream. Because screen is streaming nothing.
        3. So, must join camera first, and then, let screen connect.
        3. Or, use different id between camera and screen.

    --> OK !

    * Current Issue
    When user disconnect since screen sharing, server be dead.
	--> This is because when all the clients disconnect from server, they don't check about information once more.
	--> need to create session first. change server side

    * Functional Requirements
    - Device Change such camera (OK) / Microphone (OK)
    - Recording (Server OK. Only Front Need to be Updated)
    - Turn off my Camera(Sometimes not) / Microphone (OK)
	
*/

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
        console.log("stream created::", event);
		if (event.stream.typeOfVideo == "CAMERA") {
			// Subscribe to the Stream to receive it. HTML video will be appended to element with 'container-cameras' id
			var subscriber = sessionCamera.subscribe(event.stream, 'container-cameras');
            console.log("subscriber: ", subscriber);
			// When the HTML video has been appended to DOM...
			subscriber.on('videoElementCreated', event => {
				// Add a new <p> element for the user's nickname just below its video
				appendUserData(event.element, subscriber.stream.connection);
			});
		}
	});

    // ------- 3.2) Handle subscribers of 'Screen' type
    
    sessionScreen.on('streamCreated', event => {
		if (event.stream.typeOfVideo == "SCREEN") {
			// Subscribe to the Stream to receive it. HTML video will be appended to element with 'container-screens' id
			var subscriberScreen = sessionScreen.subscribe(event.stream, 'container-screens');
			// When the HTML video has been appended to DOM...
			subscriberScreen.on('videoElementCreated', event => {
				// Add a new <p> element for the user's nickname just below its video
				appendUserData(event.element, subscriberScreen.stream.connection);
			});
		}
	});

	// On every Stream destroyed...
	sessionCamera.on('streamDestroyed', event => {

		// Delete the HTML element with the user's nickname. HTML videos are automatically removed from DOM
		removeUserData(event.stream.connection);
	});

	// On every asynchronous exception...
	sessionCamera.on('exception', (exception) => {
		console.warn(exception);
	});


	// --- 4) Connect to the session with two different tokens: one for the camera and other for the screen ---

	// --- 4.1) Get the token for the 'sessionCamera' object
	getToken(mySessionId, false).then(token => {
        console.log("camera token", token);
		// First param is the token got from the OpenVidu deployment. Second param can be retrieved by every user on event
		// 'streamCreated' (property Stream.connection.data), and will be appended to DOM as the user's nickname
		sessionCamera.connect(token, { clientData: myUserName })
			.then(() => {
				// --- 5) Set page layout for active call ---
				document.getElementById('session-title').innerText = mySessionId;
				document.getElementById('join').style.display = 'none';
				document.getElementById('session').style.display = 'block';

				// --- 6) Get your own camera stream with the desired properties ---

				var publisher = OVCamera.initPublisher('container-cameras', {
					audioSource: undefined, // The source of audio. If undefined default microphone
					videoSource: undefined, // The source of video. If undefined default webcam
					publishAudio: true,  	// Whether you want to start publishing with your audio unmuted or not
					publishVideo: true,  	// Whether you want to start publishing with your video enabled or not
					resolution: '640x480',  // The resolution of your video
					frameRate: 30,			// The frame rate of your video
					insertMode: 'APPEND',	// How the video is inserted in the target element 'container-cameras'
					mirror: false       	// Whether to mirror your local video or not
				});

				// --- 7) Specify the actions when events take place in our publisher ---

				// When our HTML video has been added to DOM...
				publisher.on('videoElementCreated', function (event) {
					initMainVideo(event.element, myUserName);
					appendUserData(event.element, myUserName);
					event.element['muted'] = true;
				});

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
        console.log('screen token', tokenScreen);
		sessionScreen.connect(tokenScreen, { clientData: `${myUserName}-screen` }).then(() => {
			document.getElementById('buttonScreenShare').style.display = 'block';
			console.log("Session screen connected");
		}).catch((error => {
			console.warn('There was an error connecting to the session for screen share:', error.code, error.message);
		}));
	});

	initializeMyDevices();
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

	console.log(myDevices);

}

// --- 9) Function to be called when the 'Screen share' button is clicked
function publishScreenShare() {
	// --- 9.1) To create a publisherScreen set the property 'videoSource' to 'screen'
	var publisherScreen = OVScreen.initPublisher("container-screens", { videoSource: "screen" });
    myPublisher.screen = publisherScreen;

	// --- 9.2) Publish the screen share stream only after the user grants permission to the browser
    publisherScreen.once('accessAllowed', (event) => {
        document.getElementById('buttonScreenShare').style.display = 'none';
        document.getElementById('buttonStopScreenShare').style.display = 'inline-block';
        screensharing = true;
        // If the user closes the shared window or stops sharing it, unpublish the stream
        publisherScreen.stream.getMediaStream().getVideoTracks()[0].addEventListener('ended', () => {
            console.log('User pressed the "Stop sharing" button');
            sessionScreen.unpublish(publisherScreen);
            document.getElementById('buttonScreenShare').style.display = 'block';
            document.getElementById('buttonStopScreenShare').style.display = 'none';
            screensharing = false;
        });
        sessionScreen.publish(publisherScreen);
    });

    publisherScreen.on('videoElementCreated', function (event) {
        appendUserData(event.element, sessionScreen.connection);
        event.element['muted'] = true;
    });

    publisherScreen.once('accessDenied', (event) => {
        console.log("화면 공유화 권한이 없습니다. 현재 실행중인 브라우저에 화면 공유 권한을 설정해 주세요.");
        console.error('Screen Share: Access Denied');
    });
}

function unpublishScreenShare(){
    if(!screensharing){ return; }
    
    sessionScreen.unpublish(myPublisher.screen);
    document.getElementById('buttonScreenShare').style.display = 'block';
    document.getElementById('buttonStopScreenShare').style.display = 'none';
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
			console.log(connectionData)
            if(json.clientData){
                userData = json.clientData;
                break;
            }
        }
        console.log("userData:: ", userData);
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
	if (dataNodeToRemove) {
		dataNodeToRemove.parentNode.removeChild(dataNodeToRemove);
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
 * --------------------------------------------
 * CHANGING MEDIA DEVICE: CAMERA, SPEAKER
 * --------------------------------------------
 * The methods below allow client to change media devices.
 * To turn on or off, 
 */

function showMediaDevices(){
	let dialog = document.getElementById('section-media-devices');
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

	myDevices.CAMERA.track = track[0];
}

async function toggleCamera(force){
	if(force){
		let emptyTrack = createEmptyVideoTrack({width: 640, height: 480});
		try{
			let changed = await myPublisher.camera.replaceTrack(emptyTrack);
			return;
		} catch (e) {
			console.error(e);
			return;
		}
	}
	if(!myDevices.CAMERA.stopped){
		let emptyTrack = createEmptyVideoTrack({width: 640, height: 480});
		try{
			let changed = await myPublisher.camera.replaceTrack(emptyTrack);
			console.log("Camera turned off")
			myDevices.CAMERA.stopped = true;
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
			console.log("Camera turned off");
			myDevices.CAMERA.stopped = false;
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
			console.log("Microphone turned off")
			myDevices.MICROPHONE.stopped = true;
			return;
		} catch (e) {
			alert("Fail to turn off the Microphone. Please try it later.");
			console.log(e);
			return;
		}
	}

	try{
		myPublisher.camera.publishAudio(true);
		console.log("Camera turned off");
		myDevices.MICROPHONE.stopped = false;
		return;	
	} catch (e) {
		alert("Fail to turn on the Microphone. Please try it later.");
		return;
	}

	console.log("What do you want??");
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
	
	/*
	[
		{kind: 'audioinput', deviceId: 'default', label: 'ㄱ기본값 - 마크(USB Microphone) (0c45:6340)'},
		{kind: 'videoinput', deviceId: 'HASH_VALUE', label: 'WEbcam C170 (046d:082b)'},
		...
	]
	*/
	let devices = await new OpenVidu().getDevices();
	let videoDevices = devices.filter(i => i.kind === 'videoinput');

	appendSelectList(videoDevices, currentDevice, SELECT_LIST.CAMERA);
	onchangeCameraSelectList(true);
}

async function onchangeCameraSelectList(justCalled){
	let deviceSelect = document.getElementById('camera-select-list');
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
			console.log(stream);
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
		console.log('New camera is already being streamed in the meeting.')
		return;
	}

	myDevices.CAMERA.deviceId = newCameraDevice.deviceId;
	myDevices.CAMERA.name = newCameraDevice.name;

	let mediaStream = await navigator.mediaDevices.getUserMedia({
		video: {
			deviceId: {
			  exact: myDevices.CAMERA.deviceId
			}
		}
	});

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
}

async function onchangeMicrophoneSelectList(justCalled){
	let deviceSelect = document.getElementById('microphone-select-list');
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
		console.log('New microphone is already being streamed in the meeting.')
		return;
	}

	myDevices.MICROPHONE.deviceId = newMicrophoneDevice.deviceId;
	myDevices.MICROPHONE.name = newMicrophoneDevice.name;

	console.log(myDevices.MICROPHONE);
	let mediaStream = await navigator.mediaDevices.getUserMedia({
		audio: {
			deviceId: {
			  exact: myDevices.MICROPHONE.deviceId
			}
		}
	});

	let audioTrack = mediaStream.getAudioTracks()[0];

	myPublisher.camera.replaceTrack(audioTrack).then(() => {
		console.log("New track has been published")
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
			console.log(myDevices, type);
			console.log(myDevices[type]);
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

async function getToken(mySessionId, isScreen) {
    let sessionInfo = await createSession(mySessionId, isScreen);
    let token = await createToken(mySessionId, isScreen);
    return token;
//	return createSession(mySessionId).then(sessionId => createToken(sessionId));
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
 * Create Empty Media
 */

function createEmptyMediaStream(){
	return new MediaStream([createEmptyAudioTrack(), createEmptyVideoTrack({width: 640, height: 480})]);
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
	const canvas = Object.assign(document.createElement('canvas'), { width, height});
	canvas.getContext('2d').fillRect(0, 0, width, height);

	const stream = canvas.captureStream();
	const track = stream.getVideoTracks()[0];

	return Object.assign(track, { enabled: false });
}