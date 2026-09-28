import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');

test('Figma準拠の3画面と下部固定ナビゲーションを持つ', () => {
  for (const name of ['input', 'summary', 'pdf']) assert.match(html, new RegExp(`data-nav="${name}"`));
  assert.match(css, /position:\s*fixed[^}]*bottom:\s*0/s);
  assert.match(css, /env\(safe-area-inset-bottom/);
  assert.match(css, /#111b24/);
  assert.match(css, /#21e6f3/);
});

test('日別編集で既存の全入力項目を維持する', () => {
  for (const id of ['editIn1', 'editOut1', 'editIn2', 'editOut2', 'editBreak', 'editMeal', 'editDetail', 'editOff']) assert.match(html, new RegExp(`id="${id}"`));
});

test('保存キーとバックアップ形式の後方互換性を維持する', () => {
  assert.match(app, /kintai:v1:/);
  assert.match(app, /version:\s*2/);
  assert.match(app, /payload\.records/);
});

test('PDF帳票と保存・共有操作をUIから分離して維持する', () => {
  assert.match(html, /id="pdfSheet"/);
  assert.match(app, /Filesystem\.writeFile/);
  assert.match(app, /Share\.share/);
  assert.match(app, /new jsPDF/);
});
