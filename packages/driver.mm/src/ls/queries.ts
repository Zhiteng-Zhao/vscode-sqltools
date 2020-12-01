import queryFactory from '@sqltools/base-driver/dist/lib/factory';
import { IBaseQueries, ContextValue } from '@sqltools/types';
import escapeTableName from '../escape-table';

const describeTable: IBaseQueries['describeTable'] = queryFactory`
describeTable ${p => p.database}.${p => p.schema}.${p => p.label}
`;
const fetchColumns: IBaseQueries['fetchColumns'] = queryFactory`
fetchColumns
`;

const fetchRecords: IBaseQueries['fetchRecords'] = queryFactory`
TableBuilder.createTable(dataManager.get(${p => escapeTableName.escapeCacheName(p.table)}, ${p => escapeTableName.escapeKeyName(p.table)}, ${p => escapeTableName.escapeDetailAttr(p.table)}.class)).list()
`;
const countRecords: IBaseQueries['countRecords'] = queryFactory`
TableBuilder.createTable(dataManager.get(${p => escapeTableName.escapeCacheName(p.table)}, ${p => escapeTableName.escapeKeyName(p.table)}, ${p => escapeTableName.escapeDetailAttr(p.table)}.class)).count()
`;

const fetchString: IBaseQueries['fetchRecords'] = queryFactory`
dataManager.getString(${p => escapeTableName.escapeCacheName(p.table)}, ${p => escapeTableName.escapeKeyName(p.table)})
`;

const fetchFunctions: IBaseQueries['fetchFunctions'] = queryFactory`
fetchFunctions
;`;

const fetchTablesAndViews = (type: ContextValue, tableType = 'BASE TABLE'): IBaseQueries['fetchTables'] => queryFactory`
${type} ${tableType} fetchTables
`;

const searchTables: IBaseQueries['searchTables'] = queryFactory`
searchTables
`;

const searchColumns: IBaseQueries['searchColumns'] = queryFactory`
searchColumns
`;

const fetchTables: IBaseQueries['fetchTables'] = fetchTablesAndViews(ContextValue.TABLE);
const fetchViews: IBaseQueries['fetchTables'] = fetchTablesAndViews(ContextValue.VIEW, 'VIEW');
const fetchMaterializedViews: IBaseQueries['fetchTables'] = queryFactory`
fetchTables
`;
const fetchDatabases: IBaseQueries['fetchDatabases'] = queryFactory`
fetchDatabases
`;
const fetchSchemas: IBaseQueries['fetchSchemas'] = queryFactory`
fetchSchemas
`;

export default {
  describeTable,
  countRecords,
  fetchColumns,
  fetchRecords,
  fetchString,
  fetchTables,
  fetchViews,
  fetchFunctions,
  fetchDatabases,
  fetchSchemas,
  fetchMaterializedViews,
  searchTables,
  searchColumns,
};