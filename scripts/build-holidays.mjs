import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const csv = await readFile(resolve(root, 'data/official-holidays.csv'));
const text = new TextDecoder('shift_jis').decode(csv).replace(/^\uFEFF/, '');
const lines = text.trim().split(/\r?\n/).slice(1);
const holidays = {};

for (const line of lines) {
  const [rawDate, rawName] = line.split(',');
  if (!rawDate || !rawName) continue;
  const [year, month, day] = rawDate.split('/').map(Number);
  const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  holidays[date] = rawName.trim();
}

const years = Object.keys(holidays).map(date => Number(date.slice(0, 4)));
const output = {
  source: '内閣府「国民の祝日」CSV',
  sourceUrl: 'https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv',
  firstYear: Math.min(...years),
  lastYear: Math.max(...years),
  holidays,
};

await writeFile(resolve(root, 'src/holidays.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(`Generated ${Object.keys(holidays).length} holidays (${output.firstYear}-${output.lastYear})`);
