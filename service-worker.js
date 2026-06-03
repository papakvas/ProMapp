// ProMapp service worker — network-first so updates always show when online.
// Bump CACHE_VERSION whenever you want to force-flush old caches.
const CACHE_VERSION = 'promapp-v1';
const APP_SHELL = [
  './promapp-ado.html',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  // Pre-cache the app shell; activate immediately.
  event.waitUntil(
    caches.open(CACHE_VERSION).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  // Drop old caches, take control of open pages.
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Only handle GET; let the browser deal with the rest (POST to Supabase etc.)
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Never intercept Supabase / API / cross-origin calls — always go to network.
  if (url.origin !== self.location.origin) return;

  // Network-first: try the network, fall back to cache when offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        // Cache a copy of same-origin successful responses.
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./promapp-ado.html')))
  );
});
