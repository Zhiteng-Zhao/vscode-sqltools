import Queries from './queries';
import NotifyResponseError from '@sqltools/base-driver/dist/lib/exception/response-error';
import { IConnectionDriver, NSDatabase, Arg0, ContextValue, MConnectionExplorer, IQueryOptions } from '@sqltools/types';
import AbstractDriver from '@sqltools/base-driver';
import { parse as queryParse } from '@sqltools/util/query';
import generateId from '@sqltools/util/internal-id';
import keywordsCompletion from './keywords';
import fetch from 'node-fetch';

let serverConfig: ConnectionOptions;

export default class MM extends AbstractDriver<MTClient, ServerConfig> implements IConnectionDriver {
  queries = Queries;
  public async open() {
    // if (serverConfig) {
    //   return serverConfig;
    // }
    serverConfig = {
      database: this.credentials.name,
      connectionTimeoutMillis: Number(`${this.credentials.connectionTimeout || 0}`) * 1000,
      previewLimit: this.credentials.previewLimit,
      url: this.credentials.scheme + '://' + this.credentials.server + ':' + this.credentials.port + '/' + this.credentials.path
    };
    return serverConfig;
  }

  public async close() {
  }

  public query: (typeof AbstractDriver)['prototype']['query'] = async (query, opt = {}) => {
    const { requestId } = opt;
    opt.page = opt.page != undefined ? opt.page : 0;
    opt.limit = serverConfig.previewLimit;
    const queries = queryParse(query.toString()).filter(Boolean);
    let resultsAgg: NSDatabase.IResult[] = [];
    for (let q of queries) {
      let result = await this.httpGet('/debug/execute?page=' + opt.page +'&pageSize=' + opt.limit + '&code=' + q);
      const results: any[] = result.results;
      const messages = [];
      if (results.length === 0) {
        messages.push(this.prepareMessage(`${results.length} rows were affected.`));
      }
      resultsAgg.push(<NSDatabase.IResult>{
        requestId,
        resultId: generateId(),
        connId: this.getId(),
        cols: results && results.length ? Object.keys(results[0]) : [],
        messages,
        query: q,
        total: result.total,
        pageSize: opt.limit,
        page: opt.page,
        queryType: 'showRecords',
        queryParams: {
          query: q
        },
        results,
      });
    }
    return resultsAgg;
  }

  public queryAll: (typeof AbstractDriver)['prototype']['query'] = async (query, opt = {}) => {
    const { requestId } = opt;
    const queries = queryParse(query.toString()).filter(Boolean);
    let resultsAgg: NSDatabase.IResult[] = [];
    for (let q of queries) {
      let result = await this.httpGet('/debug/download?code=' + q);
      const results: any[] = result.results;
      const messages = [];
      if (results.length === 0) {
        messages.push(this.prepareMessage(`${results.length} rows were affected.`));
      }
      resultsAgg.push(<NSDatabase.IResult>{
        requestId,
        resultId: generateId(),
        connId: this.getId(),
        cols: results && results.length ? Object.keys(results[0]) : [],
        messages,
        query: q,
        total: result.total,
        queryType: 'showRecords',
        queryParams: {
          query: q
        },
        results,
      });
    }
    return resultsAgg;
  }

  private async getColumns(parent: NSDatabase.ITable): Promise<NSDatabase.IColumn[]> {
    const columnsCaches = await this.httpGet('/debug/getMember?cacheName=' + parent.schema + '&key=' + parent.label);
    let columnResults: NSDatabase.IColumn[] = [];
    for (let data of columnsCaches) {
      columnResults.push(<NSDatabase.IColumn>{
        label: data.field,
        dataType: data.type,
        detail: data.type,
        type: ContextValue.COLUMN,
        iconName: 'column',
        table: parent,
        childType: ContextValue.NO_CHILD,
      });
    }
    return columnResults;
  }

  public async testConnection() {
    await this.open();
    await fetch(serverConfig.url + '/debug/checkservice');
  }

  public async describeTable(metadata: NSDatabase.ITable, opt: IQueryOptions) {
    const { requestId } = opt;
    let resultsAgg: NSDatabase.IResult[] = [];
    const results: any[] = await this.httpGet('/debug/getMember?cacheName=' + metadata.schema + '&key=' + metadata.label);
    const messages = [];
    if (results.length === 0) {
      messages.push(this.prepareMessage(`${results.length} definition was found.`));
    }
    resultsAgg.push(<NSDatabase.IResult>{
      requestId,
      resultId: generateId(),
      connId: this.getId(),
      cols: results && results.length ? Object.keys(results[0]) : [],
      messages,
      query: this.queries.describeTable.raw,
      queryType: 'describeTable',
      results,
    });
    return resultsAgg;
  }

  public async showRecords(table: NSDatabase.ITable & { query: string} , opt: IQueryOptions & { limit: number, page?: number }) {
    const { limit, page = 0 } = opt;
    const params = { ...opt, limit, table, offset: page * limit };
    try {
      if (typeof this.queries.fetchRecords === 'function' && typeof this.queries.countRecords === 'function') {
        let records;
        if (params.table.query != undefined) {
          [ records ] = await (Promise.all([
            this.singleQuery(params.table.query, opt),
          ]));
          records.baseQuery = params.table.query;
        } else {
          switch (table.detail) {
            case 'String':
              [ records ] = await (Promise.all([
                this.singleQuery(this.queries.fetchString(params), opt),
              ]));
              records.baseQuery = this.queries.fetchString.raw;
              break;
            default:
              [ records ] = await (Promise.all([
                this.singleQuery(this.queries.fetchRecords(params), opt),
              ]));
              records.baseQuery = this.queries.fetchRecords.raw;
              break;
          }
        }
        return [records];
      }
    } catch (error) {
      return Promise.reject(error);
    }
  }

  public getInsertQuery(params: { item: NSDatabase.ITable; columns: Array<NSDatabase.IColumn> }) {
    const { item, columns } = params;
    let insertQuery;
    switch (item.detail) {
      case 'String':
        insertQuery = `dataManager.getString("${item.schema}", "${item.label}");`;
        break;
      default:
        insertQuery = `TableBuilder.createTable(dataManager.get("${item.schema}", "${item.label}", ${item.detail}.class))`;
        if (columns.length != 0) {
          insertQuery = insertQuery.concat('.where(');
          columns.forEach((col, index) => {
            if (columns.length == index + 1) {
              insertQuery = insertQuery.concat(`eq("\${${index + 1}:${col.label}}", \${${index + 1}:${col.label}:${col.dataType}}) `);
            } else {
              insertQuery = insertQuery.concat(`eq("\${${index + 1}:${col.label}}", \${${index + 1}:${col.label}:${col.dataType}}), `);
            }
          })
          insertQuery = insertQuery.concat(')');
        }
        insertQuery = insertQuery.concat('.list();');
        break;
    }
    return insertQuery;
  }

  public async getChildrenForItem({ item, parent }: Arg0<IConnectionDriver['getChildrenForItem']>) {
    switch (item.type) {
      case ContextValue.CONNECTION:
      case ContextValue.CONNECTED_CONNECTION:
        return <MConnectionExplorer.IChildItem[]>[
          { label: 'Caches', type: ContextValue.RESOURCE_GROUP, iconId: 'folder', childType: ContextValue.SCHEMA },
        ];
      case ContextValue.TABLE:
      case ContextValue.VIEW:
      case ContextValue.MATERIALIZED_VIEW:
        return this.getColumns(item as NSDatabase.ITable);
      case ContextValue.DATABASE:
        return <MConnectionExplorer.IChildItem[]>[
          { label: 'Schemas', type: ContextValue.RESOURCE_GROUP, iconId: 'folder', childType: ContextValue.SCHEMA },
        ];
      case ContextValue.RESOURCE_GROUP:
        return this.getChildrenForGroup({ item, parent });
      case ContextValue.SCHEMA:
        return <MConnectionExplorer.IChildItem[]>[
          { label: 'Keys', type: ContextValue.RESOURCE_GROUP, iconId: 'folder', childType: ContextValue.TABLE }
        ];
    }
    return [];
  }
  private async getChildrenForGroup({ parent, item }: Arg0<IConnectionDriver['getChildrenForItem']>) {
    switch (item.childType) {
      case ContextValue.SCHEMA:
        const jsonCaches = await this.httpGet('/debug/getCaches');
        let cacheResults: NSDatabase.ISchema[] = [];
        for (let data of jsonCaches) {
          cacheResults.push(<NSDatabase.ISchema>{
            database: serverConfig.database,
            label: data.cacheName,
            type: ContextValue.SCHEMA,
            iconName: 'database',
          });
        }
        return cacheResults;
      case ContextValue.TABLE:
        const jsonTables = await this.httpGet('/debug/getCacheKeys?cacheName=' + parent.label);
        let tableResults: NSDatabase.ITable[] = [];
        for (let data of jsonTables) {
          let iconName;
          let childType;
          switch (data.type) {
            case 'String':
              iconName = 'view';
              childType = ContextValue.NO_CHILD;
              break;
            default:
              iconName = 'table';
              childType = ContextValue.COLUMN;
              break;
          }
          tableResults.push(<NSDatabase.ITable>{
            database: parent.database,
            label: data.key,
            detail: data.type != undefined ? data.type : 'Table',
            schema: parent.label,
            type: ContextValue.TABLE,
            iconName: iconName, // table, view, function
            childType: childType
          });
        }
        return tableResults;
    }
    return [];
  }

  public searchItems(itemType: ContextValue, search: string, extraParams: any = {}): Promise<NSDatabase.SearchableItem[]> {
    switch (itemType) {
      case ContextValue.TABLE:
        return this.queryResults(this.queries.searchTables({ search }));
      case ContextValue.COLUMN:
        return this.queryResults(this.queries.searchColumns({ search, ...extraParams }));
    }
  }

  public getStaticCompletions = async () => {
    return keywordsCompletion;
  }

  private async httpGet(path: string) {
    const response = await fetch(serverConfig.url + path);
    if (response.ok) {
      const json = await response.json();
      if (json.code != '200') {
        return Promise.reject(new NotifyResponseError(2001, json.message, json));
      }
      return json.data;
    } else {
      return Promise.reject(new NotifyResponseError(2000, response.statusText, {code: response.status, message: response.statusText}));
    }
  }
}

export interface ServerConfig {
  port?: number;
  host?: string;
  scheme?: string;
  path?: string;
  connectionTimeoutMillis?: number;
  previewLimit?: number;
}

export interface MTClient {}

export interface ConnectionOptions {
  url?: string;
  database?: string;
  connectionTimeoutMillis?: number;
  previewLimit?: number;
}
