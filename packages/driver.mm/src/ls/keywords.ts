import { NSDatabase } from '@sqltools/types';

const keywordsArr = [
  'TableBuilder',
  'createTable()',
  'dataManager.get()',
  'DATA_CACHE',
  'Table.class',
  'where()',
  'eq()',
  'group()',
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