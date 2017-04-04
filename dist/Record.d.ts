import { Model } from 'mobx-collection-store';
import IDictionary from './interfaces/IDictionary';
import IRequestOptions from './interfaces/IRequestOptions';
import * as JsonApi from './interfaces/JsonApi';
export declare class Record extends Model {
    /**
     * Type property of the record class
     *
     * @static
     *
     * @memberOf Record
     */
    static typeAttribute: string;
    /**
     * Record id
     *
     * @type {(number|string)}
     * @memberOf Record
     */
    id: number | string;
    /**
     * Record type
     *
     * @type {string}
     * @memberOf Record
     */
    type: string;
    /**
     * Internal metadata
     *
     * @private
     * @type {IInternal}
     * @memberOf Record
     */
    private __internal;
    /**
     * Get record relationship links
     *
     * @returns {IDictionary<JsonApi.IRelationship>} Record relationship links
     *
     * @memberOf Record
     */
    getRelationshipLinks(): IDictionary<JsonApi.IRelationship>;
    /**
     * Get record metadata
     *
     * @returns {Object} Record metadata
     *
     * @memberOf Record
     */
    getMeta(): Object;
    /**
     * Get record links
     *
     * @returns {IDictionary<JsonApi.ILink>} Record links
     *
     * @memberOf Record
     */
    getLinks(): IDictionary<JsonApi.ILink>;
    /**
     * Get the persisted state
     *
     * @readonly
     * @private
     * @type {boolean}
     * @memberOf Record
     */
    /**
     * Set the persisted state
     *
     * @private
     *
     * @memberOf Record
     */
    private __persisted;
    /**
     * Serialize the record into JSON API format
     *
     * @returns {JsonApi.IRecord} JSON API formated record
     *
     * @memberOf Record
     */
    toJsonApi(): JsonApi.IRecord;
    /**
     * Saves (creates or updates) the record to the server
     *
     * @param {IRequestOptions} [options] Server options
     * @returns {Promise<Record>} Returns the record is successful or rejects with an error
     *
     * @memberOf Record
     */
    save(options?: IRequestOptions): Promise<Record>;
    /**
     * Remove the records from the server and store
     *
     * @param {IRequestOptions} [options] Server options
     * @returns {Promise<boolean>} Resolves true if successfull or rejects if there was an error
     *
     * @memberOf Record
     */
    remove(options?: IRequestOptions): Promise<boolean>;
    /**
     * Set the persisted status of the record
     *
     * @param {boolean} state Is the record persisted on the server
     *
     * @memberOf Record
     */
    setPersisted(state: boolean): void;
    /**
     * Get the URL that should be used for the API calls
     *
     * @private
     * @returns {string} API URL
     *
     * @memberOf Record
     */
    private __getUrl();
}
