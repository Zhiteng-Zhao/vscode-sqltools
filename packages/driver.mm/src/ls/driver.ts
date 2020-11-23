import { Pool, PoolConfig, PoolClient, types, FieldDef } from 'pg';
import Queries from './queries';
import { IConnectionDriver, NSDatabase, Arg0, ContextValue, MConnectionExplorer } from '@sqltools/types';
import AbstractDriver from '@sqltools/base-driver';
import fs from 'fs';
import zipObject from 'lodash/zipObject';
import { parse as queryParse } from '@sqltools/util/query';
import generateId from '@sqltools/util/internal-id';
// import http from 'http';
import keywordsCompletion from './keywords';
import fetch from 'node-fetch';
const rawValue = (v: string) => v;

types.setTypeParser((types as any).builtins.TIMESTAMP || 1114, rawValue);
types.setTypeParser((types as any).builtins.TIMESTAMPTZ || 1184, rawValue);
types.setTypeParser((types as any).builtins.DATE || 1082, rawValue);

export default class PostgreSQL extends AbstractDriver<Pool, PoolConfig> implements IConnectionDriver {
  queries = Queries;
  public async open() {
    if (this.connection) {
      return this.connection;
    }
    try {
      const { ssl, ...pgOptions }: PoolConfig = this.credentials.pgOptions || {};

      let poolConfig: PoolConfig = {
        connectionTimeoutMillis: Number(`${this.credentials.connectionTimeout || 0}`) * 1000,
        ...pgOptions,
      };

      if (this.credentials.connectString) {
        poolConfig = {
          connectionString: this.credentials.connectString,
          ...poolConfig,
        }
      } else {
        poolConfig = {
          database: this.credentials.database,
          host: this.credentials.server,
          password: this.credentials.password,
          port: this.credentials.port,
          user: this.credentials.username,
          ...poolConfig,
        };
      }
      if (ssl) {
        if (typeof ssl === 'object') {
          const useSsl = {
            ...ssl,
          };
          ['ca', 'key', 'cert', 'pfx'].forEach(key => {
            if (!useSsl[key]) {
              delete useSsl[key];
              return;
            };
            this.log.info(`Reading file ${useSsl[key].replace(/^file:\/\//, '')}`)
            useSsl[key] = fs.readFileSync(useSsl[key].replace(/^file:\/\//, '')).toString();
          });
          if (Object.keys(useSsl).length > 0) {
            poolConfig.ssl = useSsl;
          }
        } else {
          poolConfig.ssl =  ssl || false;
        }
      }

      const pool = new Pool(poolConfig);
      const cli = await pool.connect();
      cli.release();
      this.connection = Promise.resolve(pool);
      return this.connection;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  public async close() {
    if (!this.connection) return Promise.resolve();
    const pool = await this.connection;
    this.connection = null;
    pool.end();
  }

  public query: (typeof AbstractDriver)['prototype']['query'] = async (query, opt = {}) => {
    const { requestId } = opt;
    const queries = queryParse(query.toString()).filter(Boolean);
    let resultsAgg: NSDatabase.IResult[] = [];
    for (let q of queries) {
      const results: any[] = [{'attr1': '1', 'attr2': '3'},{'attr1': '2', 'attr2': '4'}];
      const messages = [];
      if (results.length === 0 && q.toLowerCase() !== 'select') {
        messages.push(this.prepareMessage(`${results.length} rows were affected.`));
      }
      resultsAgg.push(<NSDatabase.IResult>{
        requestId,
        resultId: generateId(),
        connId: this.getId(),
        // cols: results && results.length ? Object.keys(results[0]) : [],
        cols: ['attr1', 'attr2'],
        messages,
        query: q,
        results,
      });
    }
    return resultsAgg;
  }

  /*
  public query: (typeof AbstractDriver)['prototype']['query'] = (query, opt = {}) => {
    const messages = [];
    let cli : PoolClient;
    const { requestId } = opt;
    return this.open()
      .then(async (pool) => {
        cli = await pool.connect();
        cli.on('notice', notice => messages.push(this.prepareMessage(`${notice.name.toUpperCase()}: ${notice.message}`)));
        const results = await cli.query({ text: query.toString(), rowMode: 'array' });
        cli.release();
        return results;
      })
      .then((results: any[] | any) => {
        const queries = queryParse(query.toString(), 'pg');
        if (!Array.isArray(results)) {
          results = [results];
        }

        return results.map((r, i): NSDatabase.IResult => {
          const cols = this.getColumnNames(r.fields || []);
          return {
            requestId,
            resultId: generateId(),
            connId: this.getId(),
            cols,
            messages: messages.concat([
              this.prepareMessage(`${r.command} successfully executed.${
                r.command.toLowerCase() !== 'select' && typeof r.rowCount === 'number' ? ` ${r.rowCount} rows were affected.` : ''
              }`)
            ]),
            query: queries[i],
            results: this.mapRows(r.rows, cols),
          };
        });
      })
      .catch(err => {
        cli && cli.release();
        return [<NSDatabase.IResult>{
          connId: this.getId(),
          requestId,
          resultId: generateId(),
          cols: [],
          messages: messages.concat([
            this.prepareMessage ([
              (err && err.message || err),
              err && err.routine === 'scanner_yyerror' && err.position ? `at character ${err.position}` : undefined
            ].filter(Boolean).join(' '))
          ]),
          error: true,
          rawError: err,
          query,
          results: [],
        }];
      });
  }
  */

  private getColumnNames(fields: FieldDef[]): string[] {
    return fields.reduce((names, { name }) => {
      const count = names.filter((n) => n === name).length;
      return names.concat(count > 0 ? `${name} (${count})` : name);
    }, []);
  }

  private mapRows(rows: any[], columns: string[]): any[] {
    return rows.map((r) => zipObject(columns, r));
  }

  private async getColumns(parent: NSDatabase.ITable): Promise<NSDatabase.IColumn[]> {

    return <NSDatabase.IColumn[]>[{
      database: 'clearAccountNo',
      label: 'clearAccountNo',
      dataType: 'string',
      type: ContextValue.COLUMN,
      iconName: 'column',
      table: parent,
      childType: ContextValue.NO_CHILD,
    },{
      database: 'ClearMemberId',
      label: 'ClearMemberId',
      dataType: 'string',
      type: ContextValue.COLUMN,
      iconName: 'column',
      table: parent,
      childType: ContextValue.NO_CHILD,
    }];

    // const results = await this.queryResults(this.queries.fetchColumns(parent));
    // return results.map(col => ({
    //   ...col,
    //   iconName: col.isPk ? 'pk' : (col.isFk ? 'fk' : null),
    //   childType: ContextValue.NO_CHILD,
    //   table: parent
    // }));
  }

  public async testConnection() {
    console.log('right here!');
    // var options = {
    //   method: "GET",
    // };
    // http.get("http://127.0.0.1:8080/test/test", options, (res: http.IncomingMessage) => {
    //   res.on("data", function (d) {
    //     console.log("result:" + d);
    //   });
    // })
    const response = await fetch('http://127.0.0.1:8080/test/test');
    const json = await response.text();
    console.log(json);
    console.log("function end.");
    // const pool = await this.open()
    // const cli = await pool.connect();
    // await cli.query('SELECT 1');
    // cli.release();
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
    console.log("#### " + item.type);
    switch (item.type) {
      case ContextValue.CONNECTION:
      case ContextValue.CONNECTED_CONNECTION:
        return <MConnectionExplorer.IChildItem[]>[
          { label: 'Caches', type: ContextValue.RESOURCE_GROUP, iconId: 'folder', childType: ContextValue.SCHEMA },
        ];
        // return this.queryResults(this.queries.fetchDatabases());
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
          // { label: 'Tables', type: ContextValue.RESOURCE_GROUP, iconId: 'folder', childType: ContextValue.TABLE },
          // { label: 'Views', type: ContextValue.RESOURCE_GROUP, iconId: 'folder', childType: ContextValue.VIEW }
        ];
    }
    return [];
  }
  private async getChildrenForGroup({ parent, item }: Arg0<IConnectionDriver['getChildrenForItem']>) {
    switch (item.childType) {
      case ContextValue.SCHEMA:
        console.log("get schema");
        return <NSDatabase.ISchema[]>[{
          database: 'mt.default.cache',
          label: 'mt.default.cache',
          type: ContextValue.SCHEMA,
          iconName: 'database',
        },{
          database: 'mt.rt.cache',
          label: 'mt.rt.cache',
          type: ContextValue.SCHEMA,
          iconName: 'database',
        }];
        // return this.queryResults(this.queries.fetchSchemas(parent as NSDatabase.IDatabase));
      case ContextValue.TABLE:
        console.log("get table" + parent);
        if (parent.database == 'mt.default.cache') {
          return <NSDatabase.ITable[]>[{
            database: 'ClearAccount',
            label: 'ClearAccount',
            type: ContextValue.TABLE,
            iconName: 'table',
            childType: ContextValue.COLUMN
          },{
            database: 'ClearMember',
            label: 'ClearMember',
            type: ContextValue.TABLE,
            iconName: 'table',
            childType: ContextValue.COLUMN
          }];
        } else {
          return <NSDatabase.ITable[]>[{
            database: 'OptLogoutPara',
            label: 'OptLogoutPara',
            type: ContextValue.TABLE,
            iconName: 'table',
            childType: ContextValue.NO_CHILD
          },{
            database: 'MemberOpTime',
            label: 'MemberOpTime',
            type: ContextValue.TABLE,
            iconName: 'table',
            childType: ContextValue.NO_CHILD
          }];
        }
        
        
        // return this.queryResults(this.queries.fetchTables(parent as NSDatabase.ISchema));
      case ContextValue.VIEW:
        return this.queryResults(this.queries.fetchViews(parent as NSDatabase.ISchema));
      case ContextValue.MATERIALIZED_VIEW:
        return this.queryResults(this.queries.fetchMaterializedViews(parent as NSDatabase.ISchema));
      case ContextValue.FUNCTION:
        return this.queryResults(this.queries.fetchFunctions(parent as NSDatabase.ISchema));
    }
    return [];
  }

  public searchItems(itemType: ContextValue, search: string, extraParams: any = {}): Promise<NSDatabase.SearchableItem[]> {
    console.log(itemType);
    switch (itemType) {
      case ContextValue.TABLE:
        return this.queryResults(this.queries.searchTables({ search }));
      case ContextValue.COLUMN:
        return this.queryResults(this.queries.searchColumns({ search, ...extraParams }));
    }
  }

  // private completionsCache: { [w: string]: NSDatabase.IStaticCompletion } = null;
  /*
  public getStaticCompletions = async () => {
    if (this.completionsCache) return this.completionsCache;
    this.completionsCache = {};
    const items = await this.queryResults('SELECT UPPER(word) AS label, UPPER(catdesc) AS desc FROM pg_get_keywords();');

    items.forEach((item: any) => {
      this.completionsCache[item.label] = {

        label: item.label,
        detail: item.label,
        filterText: item.label,
        sortText: (['SELECT', 'CREATE', 'UPDATE', 'DELETE'].includes(item.label) ? '2:' : '') + item.label,
        documentation: {
          value: `\`\`\`yaml\nWORD: ${item.label}\nTYPE: ${item.desc}\n\`\`\``,
          kind: 'markdown'
        }
      }
    });

    return this.completionsCache;
  }
  */
  public getStaticCompletions = async () => {
    return keywordsCompletion;
  }
}
