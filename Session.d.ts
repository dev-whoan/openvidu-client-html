import { Connection } from './Connection';
import { ConnectionProperties } from './ConnectionProperties';
import { OpenVidu } from './OpenVidu';
import { Publisher } from './Publisher';
import { SessionProperties } from './SessionProperties';
import { TokenOptions } from './TokenOptions';
export declare class Session {
    private ov;
    /**
     * Unique identifier of the Session
     */
    sessionId: string;
    /**
     * Timestamp when this session was created, in UTC milliseconds (ms since Jan 1, 1970, 00:00:00 UTC)
     */
    createdAt: number;
    /**
     * Properties defining the session
     */
    properties: SessionProperties;
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
    connections: Connection[];
    /**
     * Array containing the active Connections of the Session. It is a subset of [[Session.connections]] array containing only
     * those Connections with property [[Connection.status]] to `active`.
     *
     * To get the array of active Connections with their current actual value, you must call [[Session.fetch]] or [[OpenVidu.fetch]]
     * before consulting property [[activeConnections]]
     */
    activeConnections: Connection[];
    /**
     * Whether the session is being recorded or not
     */
    recording: boolean;
    /**
     * @hidden
     */
    constructor(ov: OpenVidu, propertiesOrJson?: any);
    /**
     * @deprecated Use [[Session.createConnection]] instead to get a [[Connection]] object.
     *
     * @returns A Promise that is resolved to the generated _token_ string if success and rejected with an Error object if not
     */
    generateToken(tokenOptions?: TokenOptions): Promise<string>;
    /**
     * Creates a new Connection object associated to Session object and configured with
     * `connectionProperties`. Each user connecting to the Session requires a Connection.
     * The token string value to send to the client side is available at [[Connection.token]].
     *
     * @returns A Promise that is resolved to the generated [[Connection]] object if success and rejected with an Error object if not
     */
    createConnection(connectionProperties?: ConnectionProperties): Promise<Connection>;
    /**
     * Gracefully closes the Session: unpublishes all streams and evicts every participant
     *
     * @returns A Promise that is resolved if the session has been closed successfully and rejected with an Error object if not
     */
    close(): Promise<any>;
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
    fetch(): Promise<boolean>;
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
    forceDisconnect(connection: string | Connection): Promise<any>;
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
    forceUnpublish(publisher: string | Publisher): Promise<any>;
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
    updateConnection(connectionId: string, connectionProperties: ConnectionProperties): Promise<Connection | undefined>;
    /**
     * @hidden
     */
    getSessionId(): string;
    /**
     * @hidden
     */
    getSessionHttp(): Promise<string>;
    /**
     * @hidden
     */
    resetWithJson(json: any): Session;
    /**
     * @hidden
     */
    equalTo(other: Session): boolean;
    /**
     * @hidden
     */
    private removeCircularOpenViduReference;
    /**
     * @hidden
     */
    private updateActiveConnectionsArray;
    /**
     * @hidden
     */
    private handleError;
}
