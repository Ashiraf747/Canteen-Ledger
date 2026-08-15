const CACHE_NAME = 'canteen-ledger-v1';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// App-shell files: cache-first (instant load, works offline).
// Anything else (the Apps Script API calls): network-only — this is live
// data, the app's own JS layer handles offline queueing for those, not this
// service worker.
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  const isShellRequest = APP_SHELL.some((p) => url.endsWith(p.replace('./', '')));
  if (event.request.method !== 'GET' || !isShellRequest) return; // let it hit the network normally

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return resp;
      });
    })
  );
});
