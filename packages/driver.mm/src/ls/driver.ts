import Queries from './queries';
import { IConnectionDriver, NSDatabase, Arg0, ContextValue, MConnectionExplorer } from '@sqltools/types';
import AbstractDriver from '@sqltools/base-driver';
import { parse as queryParse } from '@sqltools/util/query';
import generateId from '@sqltools/util/internal-id';
import keywordsCompletion from './keywords';
import fetch from 'node-fetch';

let serverConfig: ConnectionOptions;

export default class MM extends AbstractDriver<MTClient, ServerConfig> implements IConnectionDriver {
  queries = Queries;
  public async open() {
    if (serverConfig) {
      return serverConfig;
    }
    serverConfig = {
      connectionTimeoutMillis: Number(`${this.credentials.connectionTimeout || 0}`) * 1000,
      url: this.credentials.scheme + '://' + this.credentials.server + ':' + this.credentials.port + '/' + this.credentials.path
    };
    return serverConfig;
  }

  public async close() {
  }

  public query: (typeof AbstractDriver)['prototype']['query'] = async (query, opt = {}) => {
    const { requestId } = opt;
    const queries = queryParse(query.toString()).filter(Boolean);
    let resultsAgg: NSDatabase.IResult[] = [];
    for (let q of queries) {
      const results: any[] = await this.httpGet('/debug/execute?code=' + q);
      const messages = [];
      if (results.length === 0 && q.toLowerCase() !== 'select') {
        messages.push(this.prepareMessage(`${results.length} rows were affected.`));
      }
      resultsAgg.push(<NSDatabase.IResult>{
        requestId,
        resultId: generateId(),
        connId: this.getId(),
        cols: results && results.length ? Object.keys(results[0]) : [],
        messages,
        query: q,
        results,
      });
    }
    return resultsAgg;
  }

  private async getColumns(parent: NSDatabase.ITable): Promise<NSDatabase.IColumn[]> {
    const columnsCaches = await this.httpGet('/debug/columns?parent=' + parent.label);
    let columnResults: NSDatabase.IColumn[] = [];
    for (let data of columnsCaches) {
      columnResults.push(<NSDatabase.IColumn>{
        label: data.label,
        dataType: data.dataType,
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
    await fetch(serverConfig.url + 'debug/checkservice');
  }

  public getInsertQuery(params: { item: NSDatabase.ITable; columns: Array<NSDatabase.IColumn> }) {
    const { item, columns } = params;
    let insertQuery = `TableBuilder.createTable(dataManager.get(DATA_CACHE, "${item.label}", Table.class)).where(`;
    columns.forEach((col, index) => {
      if (columns.length == index + 1) {
        insertQuery = insertQuery.concat(`eq("\${${index + 1}:${col.label}}", \${${index + 1}:${col.label}:${col.dataType}}) `);
      } else {
        insertQuery = insertQuery.concat(`eq("\${${index + 1}:${col.label}}", \${${index + 1}:${col.label}:${col.dataType}}), `);
      }
    });
    insertQuery = insertQuery.concat(`).list();`);
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
        const jsonCaches = await this.httpGet('/debug/caches');
        let cacheResults: NSDatabase.ISchema[] = [];
        for (let data of jsonCaches) {
          cacheResults.push(<NSDatabase.ISchema>{
            database: data.database,
            label: data.label,
            type: ContextValue.SCHEMA,
            iconName: 'database',
          });
        }
        return cacheResults;
      case ContextValue.TABLE:
        const jsonTables = await this.httpGet('/debug/tables?parent=' + parent.label);
        let tableResults: NSDatabase.ITable[] = [];
        for (let data of jsonTables) {
          tableResults.push(<NSDatabase.ITable>{
            database: data.database,
            label: data.label,
            type: ContextValue.TABLE,
            iconName: 'table',
            childType: ContextValue.COLUMN
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
    const json = await response.json();
    const messages = [];
    if (json.length === 0) {
      messages.push(this.prepareMessage(`no rows.`));
    }
    return json;
  }

}

export interface ServerConfig {
  port?: number;
  host?: string;
  scheme?: string;
  path?: string;
  connectionTimeoutMillis?: number;
}

export interface MTClient {}

export interface ConnectionOptions {
  url?: string;
  connectionTimeoutMillis?: number;
}
