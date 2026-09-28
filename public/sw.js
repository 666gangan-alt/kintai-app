const CACHE = 'kintai-v4';
const SHELL = ['./', './index.html', './manifest.webmanifest'];
const IS_CAPACITOR_HOST = self.location.hostname === 'localhost';

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
    // 旧APKのキャッシュに制御されている画面だけを一度再読込し、新しい同梱資産へ移行する。
    if (IS_CAPACITOR_HOST) {
      const windows = await self.clients.matchAll({ type: 'window' });
      await Promise.all(windows.map(client => client.navigate(client.url)));
    }
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
      return response;
    }))
  );
});
