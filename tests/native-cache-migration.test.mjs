import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Android版は旧Service Workerとキャッシュを解除する', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /Capacitor\.isNativePlatform\(\)/);
  assert.match(app, /navigator\.serviceWorker\.getRegistrations\(\)/);
  assert.match(app, /registration => registration\.unregister\(\)/);
  assert.match(app, /keys\.map\(key => caches\.delete\(key\)\)/);
});

test('更新用Service Workerは旧キャッシュと異なるバージョンを使う', async () => {
  const worker = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
  assert.match(worker, /kintai-v5/);
  assert.match(worker, /client\.navigate\(client\.url\)/);
});

test('Androidネイティブ側も旧Service WorkerとCache Storageを強制解除する', async () => {
  const activity = await readFile(
    new URL('../android/app/src/main/java/jp/local/kintai/MainActivity.java', import.meta.url),
    'utf8',
  );
  assert.match(activity, /webView\.clearCache\(true\)/);
  assert.match(activity, /navigator\.serviceWorker\.getRegistrations\(\)/);
  assert.match(activity, /regs\.map\(r=>r\.unregister\(\)\)/);
  assert.match(activity, /keys\.map\(k=>caches\.delete\(k\)\)/);
});
