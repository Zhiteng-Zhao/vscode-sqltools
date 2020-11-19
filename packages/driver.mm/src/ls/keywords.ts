import { NSDatabase } from '@sqltools/types';

const keywordsArr = [
  'TableBuilder',
  'createTable()',
  'where()',
  'eq()',
  'group()',
  'by()',
  'sum()',
  'order()',
  'asc()',
  'desc()',
  'list()',
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