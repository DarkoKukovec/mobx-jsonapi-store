import {IModel, Model} from 'mobx-collection-store';

import IDictionary from './interfaces/IDictionary';
import IRequestOptions from './interfaces/IRequestOptions';
import * as JsonApi from './interfaces/JsonApi';

import {config, create, fetchLink, handleResponse, remove, update} from './NetworkUtils';
import {Response} from './Response';
import {Store} from './Store';
import {mapItems, objectForEach} from './utils';

interface IInternal {
  relationships?: IDictionary<JsonApi.IRelationship>;
  meta?: object;
  links?: IDictionary<JsonApi.ILink>;
  persisted?: boolean;
}

export class Record extends Model implements IModel {

  /**
   * Type property of the record class
   *
   * @static
   *
   * @memberOf Record
   */
  public static typeAttribute = 'type';

  /**
   * Should the autogenerated ID be sent to the server when creating a record
   *
   * @static
   * @type {boolean}
   * @memberOf Record
   */
  public static useAutogeneratedIds: boolean = false;

  /**
   * Base url for API requests if there is no self link
   *
   * @deprecated
   * @static
   * @type {string}
   * @memberOf Record
   */
  public static baseUrl: string;

  /**
   * Endpoint for API requests if there is no self link
   *
   * @static
   * @type {string}
   * @memberOf Record
   */
  public static endpoint: string;

  public 'static': typeof Record;

  /**
   * Record id
   *
   * @type {(number|string)}
   * @memberOf Record
   */

  public id: number|string;
  /**
   * Record type
   *
   * @type {string}
   * @memberOf Record
   */
  public type: string;

  /**
   * Internal metadata
   *
   * @private
   * @type {IInternal}
   * @memberOf Record
   */
  private __internal: IInternal;

  /**
   * Cache link fetch requests
   *
   * @private
   * @type {IDictionary<Promise<Response>>}
   * @memberOf Record
   */
  private __relationshipLinkCache: IDictionary<IDictionary<Promise<Response>>> = {};

  /**
   * Cache link fetch requests
   *
   * @private
   * @type {IDictionary<Promise<Response>>}
   * @memberOf Record
   */
  private __linkCache: IDictionary<Promise<Response>> = {};

  /**
   * Get record relationship links
   *
   * @returns {IDictionary<JsonApi.IRelationship>} Record relationship links
   *
   * @memberOf Record
   */
  public getRelationshipLinks(): IDictionary<JsonApi.IRelationship> {
    return this.__internal && this.__internal.relationships;
  }

  /**
   * Fetch a relationship link
   *
   * @param {string} relationship Name of the relationship
   * @param {string} name Name of the link
   * @param {IRequestOptions} [options] Server options
   * @param {boolean} [force=false] Ignore the existing cache
   * @returns {Promise<Response>} Response promise
   *
   * @memberOf Record
   */
  public fetchRelationshipLink(
    relationship: string,
    name: string,
    options?: IRequestOptions,
    force: boolean = false,
  ): Promise<Response> {
    this.__relationshipLinkCache[relationship] = this.__relationshipLinkCache[relationship] || {};

    if (!(name in this.__relationshipLinkCache) || force) {
      const link: JsonApi.ILink = (
        'relationships' in this.__internal &&
        relationship in this.__internal.relationships &&
        name in this.__internal.relationships[relationship]
      ) ? this.__internal.relationships[relationship][name] : null;
      const headers: IDictionary<string> = options && options.headers;

      this.__relationshipLinkCache[relationship][name] = fetchLink(link, this.__collection as Store, headers, options);
    }

    return this.__relationshipLinkCache[relationship][name];
  }

  /**
   * Get record metadata
   *
   * @returns {object} Record metadata
   *
   * @memberOf Record
   */
  public getMeta(): object {
    return this.__internal && this.__internal.meta;
  }

  /**
   * Get record links
   *
   * @returns {IDictionary<JsonApi.ILink>} Record links
   *
   * @memberOf Record
   */
  public getLinks(): IDictionary<JsonApi.ILink> {
    return this.__internal && this.__internal.links;
  }

  /**
   * Fetch a record link
   *
   * @param {string} name Name of the link
   * @param {IRequestOptions} [options] Server options
   * @param {boolean} [force=false] Ignore the existing cache
   * @returns {Promise<Response>} Response promise
   *
   * @memberOf Record
   */
  public fetchLink(name: string, options?: IRequestOptions, force: boolean = false): Promise<Response> {
    if (!(name in this.__linkCache) || force) {
      const link: JsonApi.ILink = ('links' in this.__internal && name in this.__internal.links) ?
        this.__internal.links[name] : null;
      this.__linkCache[name] = fetchLink(link, this.__collection as Store, options && options.headers, options);
    }

    let request: Promise<Response> = this.__linkCache[name];

    if (this['__queue__']) {
      request = this.__linkCache[name].then((response) => {
        const related: Record = this['__related__'];
        const prop: string = this['__prop__'];
        const record: Record = response.data as Record;
        if (record && record.type !== this.type && record.type === related.type) {
          if (prop) {
            related[prop] = record;
            return response;
          }
          related.__persisted = true;
          return response.replaceData(related);
        }
        return response;
      });
    }

    return request;
  }

  /**
   * Get the persisted state
   *
   * @readonly
   * @private
   * @type {boolean}
   * @memberOf Record
   */
  private get __persisted(): boolean {
    return (this.__internal && this.__internal.persisted) || false;
  }

  /**
   * Set the persisted state
   *
   * @private
   *
   * @memberOf Record
   */
  private set __persisted(state: boolean) {
    this.__internal = this.__internal || {};
    this.__internal.persisted = state;
  }

  /**
   * Serialize the record into JSON API format
   *
   * @returns {JsonApi.IRecord} JSON API formated record
   *
   * @memberOf Record
   */
  public toJsonApi(): JsonApi.IRecord {
    const attributes: IDictionary<any> = this.toJS();
    delete attributes.id;
    delete attributes.type;

    const useAutogenerated: boolean = this.static['useAutogeneratedIds'];
    const data: JsonApi.IRecord = {
      attributes,
      id: (this.__persisted || useAutogenerated) ? this.id : undefined,
      type: this.type || this.static.type as string,
    };

    const refs: IDictionary<string> = this['__refs'];
    objectForEach(refs, (key: string) => {
      data.relationships = data.relationships || {};
      const rel = mapItems(this[`${key}Id`], (id: number|string) => ({id, type: refs[key]}));
      data.relationships[key] = {data: rel} as JsonApi.IRelationship;

      delete data.attributes[key];
      delete data.attributes[`${key}Id`];
      delete data.attributes[`${key}Meta`];
    });

    delete data.attributes.__internal;
    delete data.attributes.__type__;

    return data;
  }

  /**
   * Saves (creates or updates) the record to the server
   *
   * @param {IRequestOptions} [options] Server options
   * @returns {Promise<Record>} Returns the record is successful or rejects with an error
   *
   * @memberOf Record
   */
  public save(options?: IRequestOptions): Promise<Record> {
    const store: Store = this.__collection as Store;
    const data: JsonApi.IRecord = this.toJsonApi();
    const requestMethod: Function = this.__persisted ? update : create;
    return requestMethod(store, this.__getUrl(), {data}, options && options.headers)
      .then(handleResponse(this));
  }

  public saveRelationship(relationship: string, options?: IRequestOptions): Promise<Record> {
    const link: JsonApi.ILink = (
      'relationships' in this.__internal &&
      relationship in this.__internal.relationships &&
      'self' in this.__internal.relationships[relationship]
    ) ? this.__internal.relationships[relationship]['self'] : null;

    if (!link) {
      throw new Error('The relationship doesn\'t have a defined link');
    }

    const store: Store = this.__collection as Store;
    const href: string = typeof link === 'object' ? link.href : link;

    const type: string = this['__refs'][relationship];
    type ID = JsonApi.IIdentifier|Array<JsonApi.IIdentifier>;
    const data: ID = mapItems(this[`${relationship}Id`], (id) => ({id, type})) as ID;

    return update(store, href, {data}, options && options.headers)
      .then(handleResponse(this, relationship));
  }

  /**
   * Remove the records from the server and store
   *
   * @param {IRequestOptions} [options] Server options
   * @returns {Promise<boolean>} Resolves true if successfull or rejects if there was an error
   *
   * @memberOf Record
   */
  public remove(options?: IRequestOptions): Promise<boolean> {
    const store: Store = this.__collection as Store;
    if (!this.__persisted) {
      this.__collection.remove(this.type, this.id);
      return Promise.resolve(true);
    }
    return remove(store, this.__getUrl(), options && options.headers)
      .then((response: Response) => {
        if (response.error) {
          throw response.error;
        }

        this.__persisted = false;

        if (this.__collection) {
          this.__collection.remove(this.type, this.id);
        }

        return true;
      });
  }

  /**
   * Set the persisted status of the record
   *
   * @param {boolean} state Is the record persisted on the server
   *
   * @memberOf Record
   */
  public setPersisted(state: boolean): void {
    this.__persisted = state;
  }

  /**
   * Get the URL that should be used for the API calls
   *
   * @private
   * @returns {string} API URL
   *
   * @memberOf Record
   */
  private __getUrl(): string {

    const links: IDictionary<JsonApi.ILink> = this.getLinks();
    if (links && links.self) {
      const self: JsonApi.ILink = links.self;
      return typeof self === 'string' ? self : self.href;
    }

    const url = this.static.endpoint || this.static.baseUrl || this.type || this.static.type;

    return this.__persisted
      ? `${config.baseUrl}${url}/${this.id}`
      : `${config.baseUrl}${url}`;
  }
}
