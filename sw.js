const CACHE_NAME = 'canteen-ledger-v2';
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

// App-shell files: NETWORK-FIRST — always try to fetch the latest version
// first, so future code updates actually show up next time the app opens
// with a connection. Falls back to the cached copy only when offline.
// (An earlier cache-first version of this file caused updates to get
// stuck on old cached code — this avoids that happening again.)
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  const isShellRequest = APP_SHELL.some((p) => url.endsWith(p.replace('./', '')));
  if (event.request.method !== 'GET' || !isShellRequest) return; // let it hit the network normally

  event.respondWith(
    fetch(event.request).then((resp) => {
      const copy = resp.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      return resp;
    }).catch(() => caches.match(event.request))
  );
});
