import queryFactory from '@sqltools/base-driver/dist/lib/factory';
import { IBaseQueries, ContextValue } from '@sqltools/types';

const describeTable: IBaseQueries['describeTable'] = queryFactory`
describeTable`;
const fetchColumns: IBaseQueries['fetchColumns'] = queryFactory`
fetchColumns
`;

const fetchRecords: IBaseQueries['fetchRecords'] = queryFactory`
fetchRecords
`;
const countRecords: IBaseQueries['countRecords'] = queryFactory`
countRecords
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
  fetchTables,
  fetchViews,
  fetchFunctions,
  fetchDatabases,
  fetchSchemas,
  fetchMaterializedViews,
  searchTables,
  searchColumns,
};