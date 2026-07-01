/* Zega Digital — service worker. Makes the landing page installable and
   available offline. Cache-first for the app shell, network-first for live
   stats, and the dashboard is never cached (it is auth'd and per-user). */
const CACHE = 'zega-v2'; // bump on any landing-page / shell change to bust caches
const SHELL = [
  '/',
  '/manifest.webmanifest',
  '/vendor/qrcode.min.js',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.startsWith('/admin')) return; // never cache the dashboard

  if (url.pathname === '/public.json') {
    // Network-first so stats stay fresh; fall back to the last cached copy.
    e.respondWith(
      fetch(e.request)
        .then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); return r; })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for everything else; fall back to the cached landing page offline.
  e.respondWith(
    caches.match(e.request).then((cached) =>
      cached ||
      fetch(e.request)
        .then((r) => {
          if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); }
          return r;
        })
        .catch(() => caches.match('/'))
    )
  );
});
