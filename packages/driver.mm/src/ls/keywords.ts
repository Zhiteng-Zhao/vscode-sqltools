import { NSDatabase } from '@sqltools/types';

const keywordsArr = [
  'TableBuilder',
  'createTable()',
  'dataManager.get()',
  'dataManager.getString()',
  'dataManager.getList()',
  'DATA_CACHE',
  'Table.class',
  'where()',
  'eq()',
  'unieq()',
  'gt()',
  'ge()',
  'lt()',
  'le()',
  'in()',
  'notin()',
  'exsits()',
  'notExisits()',
  'nvl()',
  'notnvl()',
  'and()',
  'or()',
  'like()',
  'group()',
  'having()',
  'by()',
  'sum()',
  'avg()',
  'max()',
  'min()',
  'order()',
  'asc()',
  'desc()',
  'list()',
  'count()',
  'one()',
  'update()',
  'innerJoin()',
  'outerJoin()',
  'on()',
];

const keywordsCompletion: { [w: string]: NSDatabase.IStaticCompletion } = keywordsArr.reduce((agg, word) => {
  agg[word] = {
    label: word,
    detail: word,
    filterText: word,
    sortText: (['TableBuilder'].includes(word) ? '2:' : '') + word,
    documentation: {
      value: `\`\`\`yaml\nWORD: ${word}\n\`\`\``,
      kind: 'markdown'
    }
  };
  return agg;
}, {});

export default keywordsCompletion;