"use strict";
/*
 * (C) Copyright 2017-2020 OpenVidu (https://openvidu.io)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
var axios_1 = require("axios");
var Recording_1 = require("./Recording");
var Session_1 = require("./Session");
var RecordingLayout_1 = require("./RecordingLayout");
var OpenVidu = /** @class */ (function () {
    /**
     * @param hostname URL where your instance of OpenVidu Server is up an running.
     *                 It must be the full URL (e.g. `https://12.34.56.78:1234/`)
     *
     * @param secret Secret used on OpenVidu Server initialization
     */
    function OpenVidu(hostname, secret) {
        this.hostname = hostname;
        this.Buffer = require('buffer/').Buffer;
        /**
         * Array of active sessions. **This value will remain unchanged since the last time method [[OpenVidu.fetch]]
         * was called**. Exceptions to this rule are:
         *
         * - Calling [[OpenVidu.createSession]] automatically adds the new Session object to the local collection.
         * - Calling [[Session.fetch]] updates that specific Session status
         * - Calling [[Session.close]] automatically removes the Session from the list of active Sessions
         * - Calling [[Session.forceDisconnect]] automatically updates the inner affected connections for that specific Session
         * - Calling [[Session.forceUnpublish]] also automatically updates the inner affected connections for that specific Session
         * - Calling [[OpenVidu.startRecording]] and [[OpenVidu.stopRecording]] automatically updates the recording status of the
         * Session ([[Session.recording]])
         *
         * To get the array of active sessions with their current actual value, you must call [[OpenVidu.fetch]] before consulting
         * property [[activeSessions]]
         */
        this.activeSessions = [];
        this.setHostnameAndPort();
        this.basicAuth = this.getBasicAuth(secret);
    }
    /**
     * Creates an OpenVidu session. The session identifier will be available at property [[Session.sessionId]]
     *
     * @returns A Promise that is resolved to the [[Session]] if success and rejected with an Error object if not.
     */
    OpenVidu.prototype.createSession = function (properties) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var session = new Session_1.Session(_this, properties);
            session.getSessionHttp()
                .then(function (response) {
                _this.activeSessions.push(session);
                resolve(session);
            })
                .catch(function (error) {
                reject(error);
            });
        });
    };
    /**
     * Starts the recording of a [[Session]]
     *
     * @param sessionId The `sessionId` of the [[Session]] you want to start recording
     * @param name The name you want to give to the video file. You can access this same value in your clients on recording events (`recordingStarted`, `recordingStopped`)
     *
     * @returns A Promise that is resolved to the [[Recording]] if it successfully started (the recording can be stopped with guarantees) and rejected with an Error
     * object if not. This Error object has as `message` property with the following values:
     * - `404`: no session exists for the passed `sessionId`
     * - `406`: the session has no connected participants
     * - `422`: when passing [[RecordingProperties]], `resolution` parameter exceeds acceptable values (for both width and height, min 100px and max 1999px) or trying
     * to start a recording with both `hasAudio` and `hasVideo` to false
     * - `409`: the session is not configured for using [[MediaMode.ROUTED]] or it is already being recorded
     * - `501`: OpenVidu Server recording module is disabled (`OPENVIDU_RECORDING` property set to `false`)
     */
    OpenVidu.prototype.startRecording = function (sessionId, param2) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var data;
            if (!!param2) {
                if (!(typeof param2 === 'string')) {
                    var properties = param2;
                    data = {
                        session: sessionId,
                        name: !!properties.name ? properties.name : '',
                        outputMode: properties.outputMode,
                        hasAudio: properties.hasAudio != null ? properties.hasAudio : null,
                        hasVideo: properties.hasVideo != null ? properties.hasVideo : null,
                        shmSize: properties.shmSize,
                        mediaNode: properties.mediaNode
                    };
                    if ((data.hasVideo == null || data.hasVideo) && (data.outputMode == null || data.outputMode.toString() === Recording_1.Recording.OutputMode[Recording_1.Recording.OutputMode.COMPOSED]
                        || data.outputMode.toString() === Recording_1.Recording.OutputMode[Recording_1.Recording.OutputMode.COMPOSED_QUICK_START])) {
                        data.resolution = properties.resolution;
                        data.recordingLayout = !!properties.recordingLayout ? properties.recordingLayout : '';
                        if (data.recordingLayout.toString() === RecordingLayout_1.RecordingLayout[RecordingLayout_1.RecordingLayout.CUSTOM]) {
                            data.customLayout = !!properties.customLayout ? properties.customLayout : '';
                        }
                    }
                    data = JSON.stringify(data);
                }
                else {
                    data = JSON.stringify({
                        session: sessionId,
                        name: param2
                    });
                }
            }
            else {
                data = JSON.stringify({
                    session: sessionId,
                    name: ''
                });
            }
            axios_1.default.post(_this.host + OpenVidu.API_RECORDINGS_START, data, {
                headers: {
                    'Authorization': _this.basicAuth,
                    'Content-Type': 'application/json'
                }
            })
                .then(function (res) {
                if (res.status === 200) {
                    // SUCCESS response from openvidu-server (Recording in JSON format). Resolve new Recording
                    var r_1 = new Recording_1.Recording(res.data);
                    var activeSession = _this.activeSessions.find(function (s) { return s.sessionId === r_1.sessionId; });
                    if (!!activeSession) {
                        activeSession.recording = true;
                    }
                    else {
                        console.warn("No active session found for sessionId '" + r_1.sessionId + "'. This instance of OpenVidu Node Client didn't create this session");
                    }
                    resolve(r_1);
                }
                else {
                    // ERROR response from openvidu-server. Resolve HTTP status
                    reject(new Error(res.status.toString()));
                }
            }).catch(function (error) {
                if (error.response) {
                    // The request was made and the server responded with a status code (not 2xx)
                    reject(new Error(error.response.status.toString()));
                }
                else if (error.request) {
                    // The request was made but no response was received
                    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                    // http.ClientRequest in node.js
                    console.error(error.request);
                }
                else {
                    // Something happened in setting up the request that triggered an Error
                    console.error('Error', error.message);
                }
            });
        });
    };
    /**
     * Stops the recording of a [[Session]]
     *
     * @param recordingId The `id` property of the [[Recording]] you want to stop
     *
     * @returns A Promise that is resolved to the [[Recording]] if it successfully stopped and rejected with an Error object if not. This Error object has as `message` property with the following values:
     * - `404`: no recording exists for the passed `recordingId`
     * - `406`: recording has `starting` status. Wait until `started` status before stopping the recording
     */
    OpenVidu.prototype.stopRecording = function (recordingId) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            axios_1.default.post(_this.host + OpenVidu.API_RECORDINGS_STOP + '/' + recordingId, undefined, {
                headers: {
                    'Authorization': _this.basicAuth,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })
                .then(function (res) {
                if (res.status === 200) {
                    // SUCCESS response from openvidu-server (Recording in JSON format). Resolve new Recording
                    var r_2 = new Recording_1.Recording(res.data);
                    var activeSession = _this.activeSessions.find(function (s) { return s.sessionId === r_2.sessionId; });
                    if (!!activeSession) {
                        activeSession.recording = false;
                    }
                    else {
                        console.warn("No active session found for sessionId '" + r_2.sessionId + "'. This instance of OpenVidu Node Client didn't create this session");
                    }
                    resolve(r_2);
                }
                else {
                    // ERROR response from openvidu-server. Resolve HTTP status
                    reject(new Error(res.status.toString()));
                }
            }).catch(function (error) {
                if (error.response) {
                    // The request was made and the server responded with a status code (not 2xx)
                    reject(new Error(error.response.status.toString()));
                }
                else if (error.request) {
                    // The request was made but no response was received `error.request` is an instance of XMLHttpRequest
                    // in the browser and an instance of http.ClientRequest in node.js
                    console.error(error.request);
                }
                else {
                    // Something happened in setting up the request that triggered an Error
                    console.error('Error', error.message);
                }
            });
        });
    };
    /**
     * Gets an existing [[Recording]]
     *
     * @param recordingId The `id` property of the [[Recording]] you want to retrieve
     *
     * @returns A Promise that is resolved to the [[Recording]] if it successfully stopped and rejected with an Error object if not. This Error object has as `message` property with the following values:
     * - `404`: no recording exists for the passed `recordingId`
     */
    OpenVidu.prototype.getRecording = function (recordingId) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            axios_1.default.get(_this.host + OpenVidu.API_RECORDINGS + '/' + recordingId, {
                headers: {
                    'Authorization': _this.basicAuth,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })
                .then(function (res) {
                if (res.status === 200) {
                    // SUCCESS response from openvidu-server (Recording in JSON format). Resolve new Recording
                    resolve(new Recording_1.Recording(res.data));
                }
                else {
                    // ERROR response from openvidu-server. Resolve HTTP status
                    reject(new Error(res.status.toString()));
                }
            }).catch(function (error) {
                if (error.response) {
                    // The request was made and the server responded with a status code (not 2xx)
                    reject(new Error(error.response.status.toString()));
                }
                else if (error.request) {
                    // The request was made but no response was received
                    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                    // http.ClientRequest in node.js
                    console.error(error.request);
                }
                else {
                    // Something happened in setting up the request that triggered an Error
                    console.error('Error', error.message);
                }
            });
        });
    };
    /**
     * Lists all existing recordings
     *
     * @returns A Promise that is resolved to an array with all existing recordings
     */
    OpenVidu.prototype.listRecordings = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            axios_1.default.get(_this.host + OpenVidu.API_RECORDINGS, {
                headers: {
                    Authorization: _this.basicAuth
                }
            })
                .then(function (res) {
                if (res.status === 200) {
                    // SUCCESS response from openvidu-server (JSON arrays of recordings in JSON format). Resolve list of new recordings
                    var recordingArray = [];
                    var responseItems = res.data.items;
                    for (var _i = 0, responseItems_1 = responseItems; _i < responseItems_1.length; _i++) {
                        var item = responseItems_1[_i];
                        recordingArray.push(new Recording_1.Recording(item));
                    }
                    // Order recordings by time of creation (newest first)
                    recordingArray.sort(function (r1, r2) { return (r1.createdAt < r2.createdAt) ? 1 : ((r2.createdAt < r1.createdAt) ? -1 : 0); });
                    resolve(recordingArray);
                }
                else {
                    // ERROR response from openvidu-server. Resolve HTTP status
                    reject(new Error(res.status.toString()));
                }
            }).catch(function (error) {
                if (error.response) {
                    // The request was made and the server responded with a status code (not 2xx)
                    reject(new Error(error.response.status.toString()));
                }
                else if (error.request) {
                    // The request was made but no response was received
                    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                    // http.ClientRequest in node.js
                    console.error(error.request);
                }
                else {
                    // Something happened in setting up the request that triggered an Error
                    console.error('Error', error.message);
                }
            });
        });
    };
    /**
     * Deletes a [[Recording]]. The recording must have status `stopped`, `ready` or `failed`
     *
     * @param recordingId
     *
     * @returns A Promise that is resolved if the Recording was successfully deleted and rejected with an Error object if not. This Error object has as `message` property with the following values:
     * - `404`: no recording exists for the passed `recordingId`
     * - `409`: the recording has `started` status. Stop it before deletion
     */
    OpenVidu.prototype.deleteRecording = function (recordingId) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            axios_1.default.delete(_this.host + OpenVidu.API_RECORDINGS + '/' + recordingId, {
                headers: {
                    'Authorization': _this.basicAuth,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })
                .then(function (res) {
                if (res.status === 204) {
                    // SUCCESS response from openvidu-server. Resolve undefined
                    resolve(undefined);
                }
                else {
                    // ERROR response from openvidu-server. Resolve HTTP status
                    reject(new Error(res.status.toString()));
                }
            }).catch(function (error) {
                if (error.response) {
                    // The request was made and the server responded with a status code (not 2xx)
                    reject(new Error(error.response.status.toString()));
                }
                else if (error.request) {
                    // The request was made but no response was received
                    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                    // http.ClientRequest in node.js
                    console.error(error.request);
                }
                else {
                    // Something happened in setting up the request that triggered an Error
                    console.error('Error', error.message);
                }
            });
        });
    };
    /**
     * Updates every property of every active Session with the current status they have in OpenVidu Server.
     * After calling this method you can access the updated array of active sessions in [[activeSessions]]
     *
     * @returns A promise resolved to true if any Session status has changed with respect to the server, or to false if not.
     * This applies to any property or sub-property of any of the sessions locally stored in OpenVidu Node Client
     */
    OpenVidu.prototype.fetch = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            axios_1.default.get(_this.host + OpenVidu.API_SESSIONS + '?pendingConnections=true', {
                headers: {
                    Authorization: _this.basicAuth
                }
            })
                .then(function (res) {
                if (res.status === 200) {
                    // Boolean to store if any Session has changed
                    var hasChanged_1 = false;
                    // 1. Array to store fetched sessionIds and later remove closed ones
                    var fetchedSessionIds_1 = [];
                    res.data.content.forEach(function (jsonSession) {
                        var fetchedSession = new Session_1.Session(_this, jsonSession);
                        fetchedSessionIds_1.push(fetchedSession.sessionId);
                        var storedSession = _this.activeSessions.find(function (s) { return s.sessionId === fetchedSession.sessionId; });
                        if (!!storedSession) {
                            // 2. Update existing Session
                            var changed = !storedSession.equalTo(fetchedSession);
                            storedSession.resetWithJson(jsonSession);
                            console.log("Available session '" + storedSession.sessionId + "' info fetched. Any change: " + changed);
                            hasChanged_1 = hasChanged_1 || changed;
                        }
                        else {
                            // 3. Add new Session
                            _this.activeSessions.push(fetchedSession);
                            console.log("New session '" + fetchedSession.sessionId + "' info fetched");
                            hasChanged_1 = true;
                        }
                    });
                    // 4. Remove closed sessions from local collection
                    for (var i = _this.activeSessions.length - 1; i >= 0; --i) {
                        var sessionId = _this.activeSessions[i].sessionId;
                        if (!fetchedSessionIds_1.includes(sessionId)) {
                            console.log("Removing closed session '" + sessionId + "'");
                            hasChanged_1 = true;
                            _this.activeSessions.splice(i, 1);
                        }
                    }
                    console.log('Active sessions info fetched: ', fetchedSessionIds_1);
                    resolve(hasChanged_1);
                }
                else {
                    // ERROR response from openvidu-server. Resolve HTTP status
                    reject(new Error(res.status.toString()));
                }
            }).catch(function (error) {
                if (error.response) {
                    // The request was made and the server responded with a status code (not 2xx)
                    reject(new Error(error.response.status.toString()));
                }
                else if (error.request) {
                    // The request was made but no response was received
                    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                    // http.ClientRequest in node.js
                    console.error(error.request);
                    reject(error);
                }
                else {
                    // Something happened in setting up the request that triggered an Error
                    console.error('Error', error.message);
                    reject(new Error(error.message));
                }
            });
        });
    };
    /**
     * @hidden
     * @returns A map paring every existing sessionId with true or false depending on whether it has changed or not
     */
    OpenVidu.prototype.fetchWebRtc = function () {
        var _this = this;
        // tslint:disable:no-string-literal
        var addWebRtcStatsToConnections = function (connection, connectionsExtendedInfo) {
            var connectionExtended = connectionsExtendedInfo.find(function (c) { return c.connectionId === connection.connectionId; });
            if (!!connectionExtended) {
                connection.publishers.forEach(function (pub) {
                    var publisherExtended = connectionExtended.publishers.find(function (p) { return p.streamId === pub.streamId; });
                    pub['webRtc'] = {
                        kms: {
                            events: publisherExtended.events,
                            localCandidate: publisherExtended.localCandidate,
                            remoteCandidate: publisherExtended.remoteCandidate,
                            receivedCandidates: publisherExtended.receivedCandidates,
                            gatheredCandidates: publisherExtended.gatheredCandidates,
                            webrtcEndpointName: publisherExtended.webrtcEndpointName,
                            localSdp: publisherExtended.localSdp,
                            remoteSdp: publisherExtended.remoteSdp
                        }
                    };
                    pub['localCandidatePair'] = parseRemoteCandidatePair(pub['webRtc'].kms.remoteCandidate);
                    if (!!publisherExtended.serverStats) {
                        pub['webRtc'].kms.serverStats = publisherExtended.serverStats;
                    }
                });
                var subscriberArray_1 = [];
                connection.subscribers.forEach(function (sub) {
                    var subscriberExtended = connectionExtended.subscribers.find(function (s) { return s.streamId === sub; });
                    var subAux = {};
                    // Standard properties
                    subAux['streamId'] = sub;
                    subAux['publisher'] = subscriberExtended.publisher;
                    // WebRtc properties
                    subAux['createdAt'] = subscriberExtended.createdAt;
                    subAux['webRtc'] = {
                        kms: {
                            events: subscriberExtended.events,
                            localCandidate: subscriberExtended.localCandidate,
                            remoteCandidate: subscriberExtended.remoteCandidate,
                            receivedCandidates: subscriberExtended.receivedCandidates,
                            gatheredCandidates: subscriberExtended.gatheredCandidates,
                            webrtcEndpointName: subscriberExtended.webrtcEndpointName,
                            localSdp: subscriberExtended.localSdp,
                            remoteSdp: subscriberExtended.remoteSdp
                        }
                    };
                    subAux['localCandidatePair'] = parseRemoteCandidatePair(subAux['webRtc'].kms.remoteCandidate);
                    if (!!subscriberExtended.serverStats) {
                        subAux['webRtc'].kms.serverStats = subscriberExtended.serverStats;
                    }
                    subscriberArray_1.push(subAux);
                });
                connection.subscribers = subscriberArray_1;
            }
        };
        var parseRemoteCandidatePair = function (candidateStr) {
            if (!candidateStr) {
                return 'ERROR: No remote candidate available';
            }
            var array = candidateStr.split(/\s+/);
            return {
                portNumber: array[5],
                ipAddress: array[4],
                transport: array[2].toLowerCase(),
                candidateType: array[7],
                priority: array[3],
                raw: candidateStr
            };
        };
        return new Promise(function (resolve, reject) {
            axios_1.default.get(_this.host + OpenVidu.API_SESSIONS + '?webRtcStats=true', {
                headers: {
                    Authorization: _this.basicAuth
                }
            })
                .then(function (res) {
                if (res.status === 200) {
                    // Global changes
                    var globalChanges_1 = false;
                    // Collection of sessionIds telling whether each one of them has changed or not
                    var sessionChanges_1 = {};
                    // 1. Array to store fetched sessionIds and later remove closed ones
                    var fetchedSessionIds_2 = [];
                    res.data.content.forEach(function (jsonSession) {
                        var fetchedSession = new Session_1.Session(_this, jsonSession);
                        fetchedSession.connections.forEach(function (connection) {
                            addWebRtcStatsToConnections(connection, jsonSession.connections.content);
                        });
                        fetchedSessionIds_2.push(fetchedSession.sessionId);
                        var storedSession = _this.activeSessions.find(function (s) { return s.sessionId === fetchedSession.sessionId; });
                        if (!!storedSession) {
                            // 2. Update existing Session
                            var changed_1 = !storedSession.equalTo(fetchedSession);
                            if (!changed_1) { // Check if server webrtc information has changed in any Publisher object (Session.equalTo does not check Publisher.webRtc auxiliary object)
                                fetchedSession.connections.forEach(function (connection, index1) {
                                    for (var index2 = 0; (index2 < connection['publishers'].length && !changed_1); index2++) {
                                        changed_1 = changed_1 || JSON.stringify(connection['publishers'][index2]['webRtc']) !== JSON.stringify(storedSession.connections[index1]['publishers'][index2]['webRtc']);
                                    }
                                });
                            }
                            storedSession.resetWithJson(jsonSession);
                            storedSession.connections.forEach(function (connection) {
                                addWebRtcStatsToConnections(connection, jsonSession.connections.content);
                            });
                            console.log("Available session '" + storedSession.sessionId + "' info fetched. Any change: " + changed_1);
                            sessionChanges_1[storedSession.sessionId] = changed_1;
                            globalChanges_1 = globalChanges_1 || changed_1;
                        }
                        else {
                            // 3. Add new Session
                            _this.activeSessions.push(fetchedSession);
                            console.log("New session '" + fetchedSession.sessionId + "' info fetched");
                            sessionChanges_1[fetchedSession.sessionId] = true;
                            globalChanges_1 = true;
                        }
                    });
                    // 4. Remove closed sessions from local collection
                    for (var i = _this.activeSessions.length - 1; i >= 0; --i) {
                        var sessionId = _this.activeSessions[i].sessionId;
                        if (!fetchedSessionIds_2.includes(sessionId)) {
                            console.log("Removing closed session '" + sessionId + "'");
                            sessionChanges_1[sessionId] = true;
                            globalChanges_1 = true;
                            _this.activeSessions.splice(i, 1);
                        }
                    }
                    console.log('Active sessions info fetched: ', fetchedSessionIds_2);
                    resolve({ changes: globalChanges_1, sessionChanges: sessionChanges_1 });
                }
                else {
                    // ERROR response from openvidu-server. Resolve HTTP status
                    reject(new Error(res.status.toString()));
                }
            }).catch(function (error) {
                if (error.response) {
                    // The request was made and the server responded with a status code (not 2xx)
                    reject(new Error(error.response.status.toString()));
                }
                else if (error.request) {
                    // The request was made but no response was received
                    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                    // http.ClientRequest in node.js
                    console.error(error.request);
                }
                else {
                    // Something happened in setting up the request that triggered an Error
                    console.error('Error', error.message);
                }
            });
        });
    };
    // tslint:enable:no-string-literal
    OpenVidu.prototype.getBasicAuth = function (secret) {
        return 'Basic ' + this.Buffer('OPENVIDUAPP:' + secret).toString('base64');
    };
    OpenVidu.prototype.setHostnameAndPort = function () {
        var url;
        try {
            url = new URL(this.hostname);
        }
        catch (error) {
            console.error('URL format incorrect', error);
            throw new Error('URL format incorrect: ' + error);
        }
        this.host = url.protocol + '//' + url.host;
    };
    /**
     * @hidden
     */
    OpenVidu.API_PATH = '/openvidu/api';
    /**
     * @hidden
     */
    OpenVidu.API_SESSIONS = OpenVidu.API_PATH + '/sessions';
    /**
     * @hidden
     */
    OpenVidu.API_TOKENS = OpenVidu.API_PATH + '/tokens';
    /**
     * @hidden
     */
    OpenVidu.API_RECORDINGS = OpenVidu.API_PATH + '/recordings';
    /**
     * @hidden
     */
    OpenVidu.API_RECORDINGS_START = OpenVidu.API_RECORDINGS + '/start';
    /**
     * @hidden
     */
    OpenVidu.API_RECORDINGS_STOP = OpenVidu.API_RECORDINGS + '/stop';
    return OpenVidu;
}());
exports.OpenVidu = OpenVidu;
//# sourceMappingURL=OpenVidu.js.map