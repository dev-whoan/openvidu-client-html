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
var Connection_1 = require("./Connection");
var MediaMode_1 = require("./MediaMode");
var OpenVidu_1 = require("./OpenVidu");
var Recording_1 = require("./Recording");
var RecordingLayout_1 = require("./RecordingLayout");
var RecordingMode_1 = require("./RecordingMode");
var Session = /** @class */ (function () {
    /**
     * @hidden
     */
    function Session(ov, propertiesOrJson) {
        this.ov = ov;
        /**
         * Array of Connections to the Session. This property always initialize as an empty array and
         * **will remain unchanged since the last time method [[Session.fetch]] or [[OpenVidu.fetch]] was called**.
         * Exceptions to this rule are:
         *
         * - Calling [[Session.createConnection]] automatically adds the new Connection object to the local collection.
         * - Calling [[Session.forceUnpublish]] automatically updates each affected local Connection object.
         * - Calling [[Session.forceDisconnect]] automatically updates each affected local Connection object.
         * - Calling [[Session.updateConnection]] automatically updates the attributes of the affected local Connection object.
         *
         * To get the array of Connections with their current actual value, you must call [[Session.fetch]] or [[OpenVidu.fetch]]
         * before consulting property [[connections]]
         */
        this.connections = [];
        /**
         * Array containing the active Connections of the Session. It is a subset of [[Session.connections]] array containing only
         * those Connections with property [[Connection.status]] to `active`.
         *
         * To get the array of active Connections with their current actual value, you must call [[Session.fetch]] or [[OpenVidu.fetch]]
         * before consulting property [[activeConnections]]
         */
        this.activeConnections = [];
        /**
         * Whether the session is being recorded or not
         */
        this.recording = false;
        if (!!propertiesOrJson) {
            // Defined parameter
            if (!!propertiesOrJson.sessionId) {
                // Parameter is a JSON representation of Session ('sessionId' property always defined)
                this.resetWithJson(propertiesOrJson);
            }
            else {
                // Parameter is a SessionProperties object
                this.properties = propertiesOrJson;
            }
        }
        else {
            // Empty parameter
            this.properties = {};
        }
        this.properties.mediaMode = !!this.properties.mediaMode ? this.properties.mediaMode : MediaMode_1.MediaMode.ROUTED;
        this.properties.recordingMode = !!this.properties.recordingMode ? this.properties.recordingMode : RecordingMode_1.RecordingMode.MANUAL;
        this.properties.defaultOutputMode = !!this.properties.defaultOutputMode ? this.properties.defaultOutputMode : Recording_1.Recording.OutputMode.COMPOSED;
        this.properties.defaultRecordingLayout = !!this.properties.defaultRecordingLayout ? this.properties.defaultRecordingLayout : RecordingLayout_1.RecordingLayout.BEST_FIT;
        this.properties.forcedVideoCodec = !!this.properties.forcedVideoCodec ? this.properties.forcedVideoCodec : undefined;
        this.properties.allowTranscoding = this.properties.allowTranscoding != null ? this.properties.allowTranscoding : undefined;
    }
    /**
     * @deprecated Use [[Session.createConnection]] instead to get a [[Connection]] object.
     *
     * @returns A Promise that is resolved to the generated _token_ string if success and rejected with an Error object if not
     */
    Session.prototype.generateToken = function (tokenOptions) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var data = JSON.stringify({
                session: _this.sessionId,
                role: (!!tokenOptions && !!tokenOptions.role) ? tokenOptions.role : null,
                data: (!!tokenOptions && !!tokenOptions.data) ? tokenOptions.data : null,
                kurentoOptions: (!!tokenOptions && !!tokenOptions.kurentoOptions) ? tokenOptions.kurentoOptions : null
            });
            axios_1.default.post(_this.ov.host + OpenVidu_1.OpenVidu.API_TOKENS, data, {
                headers: {
                    'Authorization': _this.ov.basicAuth,
                    'Content-Type': 'application/json'
                }
            })
                .then(function (res) {
                if (res.status === 200) {
                    // SUCCESS response from openvidu-server. Resolve token
                    resolve(res.data.token);
                }
                else {
                    // ERROR response from openvidu-server. Resolve HTTP status
                    reject(new Error(res.status.toString()));
                }
            }).catch(function (error) {
                _this.handleError(error, reject);
            });
        });
    };
    /**
     * Creates a new Connection object associated to Session object and configured with
     * `connectionProperties`. Each user connecting to the Session requires a Connection.
     * The token string value to send to the client side is available at [[Connection.token]].
     *
     * @returns A Promise that is resolved to the generated [[Connection]] object if success and rejected with an Error object if not
     */
    Session.prototype.createConnection = function (connectionProperties) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var data = JSON.stringify({
                type: (!!connectionProperties && !!connectionProperties.type) ? connectionProperties.type : null,
                data: (!!connectionProperties && !!connectionProperties.data) ? connectionProperties.data : null,
                record: !!connectionProperties ? connectionProperties.record : null,
                role: (!!connectionProperties && !!connectionProperties.role) ? connectionProperties.role : null,
                kurentoOptions: (!!connectionProperties && !!connectionProperties.kurentoOptions) ? connectionProperties.kurentoOptions : null,
                rtspUri: (!!connectionProperties && !!connectionProperties.rtspUri) ? connectionProperties.rtspUri : null,
                adaptativeBitrate: !!connectionProperties ? connectionProperties.adaptativeBitrate : null,
                onlyPlayWithSubscribers: !!connectionProperties ? connectionProperties.onlyPlayWithSubscribers : null,
                networkCache: (!!connectionProperties && (connectionProperties.networkCache != null)) ? connectionProperties.networkCache : null,
                port: (!!connectionProperties && !!connectionProperties.port) ? connectionProperties.port : null,
            });
            axios_1.default.post(_this.ov.host + OpenVidu_1.OpenVidu.API_SESSIONS + '/' + _this.sessionId + '/connection', data, {
                headers: {
                    'Authorization': _this.ov.basicAuth,
                    'Content-Type': 'application/json'
                }
            })
                .then(function (res) {
                if (res.status === 200) {
                    // SUCCESS response from openvidu-server. Store and resolve Connection
                    var connection = new Connection_1.Connection(res.data);
                    _this.connections.push(connection);
                    if (connection.status === 'active') {
                        _this.activeConnections.push(connection);
                    }
                    resolve(new Connection_1.Connection(res.data));
                }
                else {
                    // ERROR response from openvidu-server. Resolve HTTP status
                    reject(new Error(res.status.toString()));
                }
            }).catch(function (error) {
                _this.handleError(error, reject);
            });
        });
    };
    /**
     * Gracefully closes the Session: unpublishes all streams and evicts every participant
     *
     * @returns A Promise that is resolved if the session has been closed successfully and rejected with an Error object if not
     */
    Session.prototype.close = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            axios_1.default.delete(_this.ov.host + OpenVidu_1.OpenVidu.API_SESSIONS + '/' + _this.sessionId, {
                headers: {
                    'Authorization': _this.ov.basicAuth,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })
                .then(function (res) {
                if (res.status === 204) {
                    // SUCCESS response from openvidu-server
                    var indexToRemove = _this.ov.activeSessions.findIndex(function (s) { return s.sessionId === _this.sessionId; });
                    _this.ov.activeSessions.splice(indexToRemove, 1);
                    resolve();
                }
                else {
                    // ERROR response from openvidu-server. Resolve HTTP status
                    reject(new Error(res.status.toString()));
                }
            }).catch(function (error) {
                _this.handleError(error, reject);
            });
        });
    };
    /**
     * Updates every property of the Session with the current status it has in OpenVidu Server. This is especially useful for accessing the list of
     * Connections of the Session ([[Session.connections]], [[Session.activeConnections]]) and use those values to call [[Session.forceDisconnect]],
     * [[Session.forceUnpublish]] or [[Session.updateConnection]].
     *
     * To update all Session objects owned by OpenVidu object at once, call [[OpenVidu.fetch]]
     *
     * @returns A promise resolved to true if the Session status has changed with respect to the server, or to false if not.
     *          This applies to any property or sub-property of the Session object
     */
    Session.prototype.fetch = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var beforeJSON = JSON.stringify(_this, _this.removeCircularOpenViduReference);
            axios_1.default.get(_this.ov.host + OpenVidu_1.OpenVidu.API_SESSIONS + '/' + _this.sessionId + '?pendingConnections=true', {
                headers: {
                    'Authorization': _this.ov.basicAuth,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })
                .then(function (res) {
                if (res.status === 200) {
                    // SUCCESS response from openvidu-server
                    _this.resetWithJson(res.data);
                    var afterJSON = JSON.stringify(_this, _this.removeCircularOpenViduReference);
                    var hasChanged = !(beforeJSON === afterJSON);
                    console.log("Session info fetched for session '" + _this.sessionId + "'. Any change: " + hasChanged);
                    resolve(hasChanged);
                }
                else {
                    // ERROR response from openvidu-server. Resolve HTTP status
                    reject(new Error(res.status.toString()));
                }
            }).catch(function (error) {
                _this.handleError(error, reject);
            });
        });
    };
    /**
     * Removes the Connection from the Session. This can translate into a forced eviction of a user from the Session if the
     * Connection had status `active` or into a token invalidation if no user had taken the Connection yet (status `pending`).
     *
     * In the first case, OpenVidu Browser will trigger the proper events in the client-side (`streamDestroyed`, `connectionDestroyed`,
     * `sessionDisconnected`) with reason set to `"forceDisconnectByServer"`.
     *
     * In the second case, the token of the Connection will be invalidated and no user will be able to connect to the session with it.
     *
     * This method automatically updates the properties of the local affected objects. This means that there is no need to call
     * [[Session.fetch]] or [[OpenVidu.fetch]]] to see the changes consequence of the execution of this method applied in the local objects.
     *
     * @param connection The Connection object to remove from the session, or its `connectionId` property
     *
     * @returns A Promise that is resolved if the Connection was successfully removed from the Session and rejected with an Error object if not
     */
    Session.prototype.forceDisconnect = function (connection) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var connectionId = typeof connection === 'string' ? connection : connection.connectionId;
            axios_1.default.delete(_this.ov.host + OpenVidu_1.OpenVidu.API_SESSIONS + '/' + _this.sessionId + '/connection/' + connectionId, {
                headers: {
                    'Authorization': _this.ov.basicAuth,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })
                .then(function (res) {
                if (res.status === 204) {
                    // SUCCESS response from openvidu-server
                    // Remove connection from connections array
                    var connectionClosed_1;
                    _this.connections = _this.connections.filter(function (con) {
                        if (con.connectionId !== connectionId) {
                            return true;
                        }
                        else {
                            connectionClosed_1 = con;
                            return false;
                        }
                    });
                    // Remove every Publisher of the closed connection from every subscriber list of other connections
                    if (!!connectionClosed_1) {
                        connectionClosed_1.publishers.forEach(function (publisher) {
                            _this.connections.forEach(function (con) {
                                con.subscribers = con.subscribers.filter(function (subscriber) {
                                    // tslint:disable:no-string-literal
                                    if (!!subscriber['streamId']) {
                                        // Subscriber with advanced webRtc configuration properties
                                        return (subscriber['streamId'] !== publisher.streamId);
                                        // tslint:enable:no-string-literal
                                    }
                                    else {
                                        // Regular string subscribers
                                        return subscriber !== publisher.streamId;
                                    }
                                });
                            });
                        });
                    }
                    else {
                        console.warn("The closed connection wasn't fetched in OpenVidu Node Client. No changes in the collection of active connections of the Session");
                    }
                    _this.updateActiveConnectionsArray();
                    console.log("Connection '" + connectionId + "' closed");
                    resolve();
                }
                else {
                    // ERROR response from openvidu-server. Resolve HTTP status
                    reject(new Error(res.status.toString()));
                }
            })
                .catch(function (error) {
                _this.handleError(error, reject);
            });
        });
    };
    /**
     * Forces some Connection to unpublish a Stream (identified by its `streamId` or the corresponding [[Publisher]] object owning it).
     * OpenVidu Browser will trigger the proper events on the client-side (`streamDestroyed`) with reason set to `"forceUnpublishByServer"`.
     *
     * You can get `publisher` parameter from [[Connection.publishers]] array ([[Publisher.streamId]] for getting each `streamId` property).
     * Remember to call [[Session.fetch]] or [[OpenVidu.fetch]] before to fetch the current actual properties of the Session from OpenVidu Server
     *
     * This method automatically updates the properties of the local affected objects. This means that there is no need to call
     * [[Session.fetch]] or [[OpenVidu.fetch]] to see the changes consequence of the execution of this method applied in the local objects.
     *
     * @param publisher The Publisher object to unpublish, or its `streamId` property
     *
     * @returns A Promise that is resolved if the stream was successfully unpublished and rejected with an Error object if not
     */
    Session.prototype.forceUnpublish = function (publisher) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var streamId = typeof publisher === 'string' ? publisher : publisher.streamId;
            axios_1.default.delete(_this.ov.host + OpenVidu_1.OpenVidu.API_SESSIONS + '/' + _this.sessionId + '/stream/' + streamId, {
                headers: {
                    'Authorization': _this.ov.basicAuth,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })
                .then(function (res) {
                if (res.status === 204) {
                    // SUCCESS response from openvidu-server
                    _this.connections.forEach(function (connection) {
                        // Try to remove the Publisher from the Connection publishers collection
                        connection.publishers = connection.publishers.filter(function (pub) { return pub.streamId !== streamId; });
                        // Try to remove the Publisher from the Connection subscribers collection
                        if (!!connection.subscribers && connection.subscribers.length > 0) {
                            // tslint:disable:no-string-literal
                            if (!!connection.subscribers[0]['streamId']) {
                                // Subscriber with advanced webRtc configuration properties
                                connection.subscribers = connection.subscribers.filter(function (sub) { return sub['streamId'] !== streamId; });
                                // tslint:enable:no-string-literal
                            }
                            else {
                                // Regular string subscribers
                                connection.subscribers = connection.subscribers.filter(function (sub) { return sub !== streamId; });
                            }
                        }
                    });
                    _this.updateActiveConnectionsArray();
                    console.log("Stream '" + streamId + "' unpublished");
                    resolve();
                }
                else {
                    // ERROR response from openvidu-server. Resolve HTTP status
                    reject(new Error(res.status.toString()));
                }
            }).catch(function (error) {
                _this.handleError(error, reject);
            });
        });
    };
    /**
     * **This feature is part of OpenVidu Pro tier** <a href="https://docs.openvidu.io/en/stable/openvidu-pro/" target="_blank" style="display: inline-block; background-color: rgb(0, 136, 170); color: white; font-weight: bold; padding: 0px 5px; margin-right: 5px; border-radius: 3px; font-size: 13px; line-height:21px; font-family: Montserrat, sans-serif">PRO</a>
     *
     * Updates the properties of a Connection  with a [[ConnectionProperties]] object.
     * Only these properties can be updated:
     *
     * - [[ConnectionProperties.role]]
     * - [[ConnectionProperties.record]]
     *
     * This method automatically updates the properties of the local affected objects. This means that there is no need to call
     * [[Session.fetch]] or [[OpenVidu.fetch]] to see the changes consequence of the execution of this method applied in the local objects.
     *
     * The affected client will trigger one [ConnectionPropertyChangedEvent](/en/stable/api/openvidu-browser/classes/connectionpropertychangedevent.html)
     * for each modified property.
     *
     * @param connectionId The [[Connection.connectionId]] of the Connection object to modify
     * @param connectionProperties A new [[ConnectionProperties]] object with the updated values to apply
     *
     * @returns A Promise that is resolved to the updated [[Connection]] object if the operation was
     *          successful and rejected with an Error object if not
     */
    Session.prototype.updateConnection = function (connectionId, connectionProperties) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            axios_1.default.patch(_this.ov.host + OpenVidu_1.OpenVidu.API_SESSIONS + "/" + _this.sessionId + "/connection/" + connectionId, connectionProperties, {
                headers: {
                    'Authorization': _this.ov.basicAuth,
                    'Content-Type': 'application/json'
                }
            })
                .then(function (res) {
                if (res.status === 200) {
                    console.log('Connection ' + connectionId + ' updated');
                }
                else {
                    // ERROR response from openvidu-server. Resolve HTTP status
                    reject(new Error(res.status.toString()));
                    return;
                }
                // Update the actual Connection object with the new options
                var existingConnection = _this.connections.find(function (con) { return con.connectionId === connectionId; });
                if (!existingConnection) {
                    // The updated Connection is not available in local map
                    var newConnection = new Connection_1.Connection(res.data);
                    _this.connections.push(newConnection);
                    _this.updateActiveConnectionsArray();
                    resolve(newConnection);
                }
                else {
                    // The updated Connection was available in local map
                    existingConnection.overrideConnectionProperties(connectionProperties);
                    _this.updateActiveConnectionsArray();
                    resolve(existingConnection);
                }
            }).catch(function (error) {
                _this.handleError(error, reject);
            });
        });
    };
    /**
     * @hidden
     */
    Session.prototype.getSessionId = function () {
        return this.sessionId;
    };
    /**
     * @hidden
     */
    Session.prototype.getSessionHttp = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (!!_this.sessionId) {
                resolve(_this.sessionId);
            }
            var mediaMode = !!_this.properties.mediaMode ? _this.properties.mediaMode : MediaMode_1.MediaMode.ROUTED;
            var recordingMode = !!_this.properties.recordingMode ? _this.properties.recordingMode : RecordingMode_1.RecordingMode.MANUAL;
            var defaultOutputMode = !!_this.properties.defaultOutputMode ? _this.properties.defaultOutputMode : Recording_1.Recording.OutputMode.COMPOSED;
            var defaultRecordingLayout = !!_this.properties.defaultRecordingLayout ? _this.properties.defaultRecordingLayout : RecordingLayout_1.RecordingLayout.BEST_FIT;
            var defaultCustomLayout = !!_this.properties.defaultCustomLayout ? _this.properties.defaultCustomLayout : '';
            var customSessionId = !!_this.properties.customSessionId ? _this.properties.customSessionId : '';
            var mediaNode = !!_this.properties.mediaNode ? _this.properties.mediaNode : undefined;
            var forcedVideoCodec = !!_this.properties.forcedVideoCodec ? _this.properties.forcedVideoCodec : undefined;
            var allowTranscoding = _this.properties.allowTranscoding != null ? _this.properties.allowTranscoding : undefined;
            var data = JSON.stringify({
                mediaMode: mediaMode, recordingMode: recordingMode, defaultOutputMode: defaultOutputMode, defaultRecordingLayout: defaultRecordingLayout, defaultCustomLayout: defaultCustomLayout,
                customSessionId: customSessionId, mediaNode: mediaNode, forcedVideoCodec: forcedVideoCodec, allowTranscoding: allowTranscoding
            });
            axios_1.default.post(_this.ov.host + OpenVidu_1.OpenVidu.API_SESSIONS, data, {
                headers: {
                    'Authorization': _this.ov.basicAuth,
                    'Content-Type': 'application/json'
                }
            })
                .then(function (res) {
                if (res.status === 200) {
                    // SUCCESS response from openvidu-server. Resolve token
                    _this.sessionId = res.data.id;
                    _this.createdAt = res.data.createdAt;
                    _this.properties.mediaMode = mediaMode;
                    _this.properties.recordingMode = recordingMode;
                    _this.properties.defaultOutputMode = defaultOutputMode;
                    _this.properties.defaultRecordingLayout = defaultRecordingLayout;
                    _this.properties.defaultCustomLayout = defaultCustomLayout;
                    _this.properties.customSessionId = customSessionId;
                    _this.properties.mediaNode = mediaNode;
                    _this.properties.forcedVideoCodec = res.data.forcedVideoCodec;
                    _this.properties.allowTranscoding = res.data.allowTranscoding;
                    resolve(_this.sessionId);
                }
                else {
                    // ERROR response from openvidu-server. Resolve HTTP status
                    reject(new Error(res.status.toString()));
                }
            }).catch(function (error) {
                if (error.response) {
                    // The request was made and the server responded with a status code (not 2xx)
                    if (error.response.status === 409) {
                        // 'customSessionId' already existed
                        _this.sessionId = _this.properties.customSessionId;
                        resolve(_this.sessionId);
                    }
                    else {
                        reject(new Error(error.response.status.toString()));
                    }
                }
                else if (error.request) {
                    // The request was made but no response was received
                    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                    // http.ClientRequest in node.js
                    console.error(error.request);
                    reject(new Error(error.request));
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
     */
    Session.prototype.resetWithJson = function (json) {
        var _this = this;
        this.sessionId = json.sessionId;
        this.createdAt = json.createdAt;
        this.recording = json.recording;
        this.properties = {
            customSessionId: json.customSessionId,
            mediaMode: json.mediaMode,
            recordingMode: json.recordingMode,
            defaultOutputMode: json.defaultOutputMode,
            defaultRecordingLayout: json.defaultRecordingLayout,
            defaultCustomLayout: json.defaultCustomLayout,
            forcedVideoCodec: json.forcedVideoCodec,
            allowTranscoding: json.allowTranscoding
        };
        if (json.defaultRecordingLayout == null) {
            delete this.properties.defaultRecordingLayout;
        }
        if (json.customSessionId == null) {
            delete this.properties.customSessionId;
        }
        if (json.defaultCustomLayout == null) {
            delete this.properties.defaultCustomLayout;
        }
        if (json.mediaNode == null) {
            delete this.properties.mediaNode;
        }
        if (json.forcedVideoCodec == null) {
            delete this.properties.forcedVideoCodec;
        }
        if (json.allowTranscoding == null) {
            delete this.properties.allowTranscoding;
        }
        // 1. Array to store fetched connections and later remove closed ones
        var fetchedConnectionIds = [];
        json.connections.content.forEach(function (jsonConnection) {
            var connectionObj = new Connection_1.Connection(jsonConnection);
            fetchedConnectionIds.push(connectionObj.connectionId);
            var storedConnection = _this.connections.find(function (c) { return c.connectionId === connectionObj.connectionId; });
            if (!!storedConnection) {
                // 2. Update existing Connection
                storedConnection.resetWithJson(jsonConnection);
            }
            else {
                // 3. Add new Connection
                _this.connections.push(connectionObj);
            }
        });
        // 4. Remove closed sessions from local collection
        for (var i = this.connections.length - 1; i >= 0; --i) {
            if (!fetchedConnectionIds.includes(this.connections[i].connectionId)) {
                this.connections.splice(i, 1);
            }
        }
        // Order connections by time of creation
        this.connections.sort(function (c1, c2) { return (c1.createdAt > c2.createdAt) ? 1 : ((c2.createdAt > c1.createdAt) ? -1 : 0); });
        // Populate activeConnections array
        this.updateActiveConnectionsArray();
        return this;
    };
    /**
     * @hidden
     */
    Session.prototype.equalTo = function (other) {
        var equals = (this.sessionId === other.sessionId &&
            this.createdAt === other.createdAt &&
            this.recording === other.recording &&
            this.connections.length === other.connections.length &&
            JSON.stringify(this.properties) === JSON.stringify(other.properties));
        if (equals) {
            var i = 0;
            while (equals && i < this.connections.length) {
                equals = this.connections[i].equalTo(other.connections[i]);
                i++;
            }
            return equals;
        }
        else {
            return false;
        }
    };
    /**
     * @hidden
     */
    Session.prototype.removeCircularOpenViduReference = function (key, value) {
        if (key === 'ov' && value instanceof OpenVidu_1.OpenVidu) {
            return;
        }
        else {
            return value;
        }
    };
    /**
     * @hidden
     */
    Session.prototype.updateActiveConnectionsArray = function () {
        var _this = this;
        this.activeConnections = [];
        this.connections.forEach(function (con) {
            if (con.status === 'active') {
                _this.activeConnections.push(con);
            }
        });
    };
    /**
     * @hidden
     */
    Session.prototype.handleError = function (error, reject) {
        if (error.response) {
            // The request was made and the server responded with a status code (not 2xx)
            reject(new Error(error.response.status.toString()));
        }
        else if (error.request) {
            // The request was made but no response was received
            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
            // http.ClientRequest in node.js
            console.error(error.request);
            reject(new Error(error.request));
        }
        else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error', error.message);
            reject(new Error(error.message));
        }
    };
    return Session;
}());
exports.Session = Session;
//# sourceMappingURL=Session.js.map
