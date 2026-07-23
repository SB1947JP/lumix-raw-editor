/*
 * Service worker for the installed (PWA) app — hand-rolled rather than pulling
 * in Workbox/vite-plugin-pwa, in keeping with the rest of the project (the map
 * and the JPEG metadata writer are hand-rolled for the same reason).
 *
 * Strategy is deliberately simple: runtime caching, no build-time precache
 * manifest to keep in sync. Same-origin assets (the hashed JS/CSS/wasm, fonts,
 * icons) are cache-first — once fetched they work offline and load instantly.
 * Navigations are network-first so a fresh deploy is picked up when online, with
 * the cached shell as the offline fallback. Cross-origin requests — only the
 * OpenStreetMap map tiles — are left entirely alone: they go straight to the
 * network (so the map needs a connection) and their opaque responses are never
 * cached. Nothing here weakens the app's no-exfiltration stance; the worker only
 * ever reads and stores this origin's own files.
 */

const CACHE = 'sre-cache-v1';

self.addEventListener('install', () => {
  // Take over as soon as installed rather than waiting for every tab to close.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from older versions of this worker.
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Leave cross-origin requests (the OSM tiles) to the network untouched — their
  // responses are opaque and shouldn't be cached, and the map needs a live
  // connection anyway.
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first, so a new deploy shows up when online; fall back
  // to the cached shell (the app's own entry) when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(CACHE);
          cache.put(req, res.clone());
          return res;
        } catch {
          return (
            (await caches.match(req)) ||
            (await caches.match(self.registration.scope)) ||
            Response.error()
          );
        }
      })(),
    );
    return;
  }

  // Everything else same-origin (hashed assets, wasm, fonts, icons): cache-first,
  // populating the cache on the first miss.
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        // Only cache complete, same-origin ("basic") 200s.
        if (res.ok && res.type === 'basic') {
          const cache = await caches.open(CACHE);
          cache.put(req, res.clone());
        }
        return res;
      } catch {
        return cached || Response.error();
      }
    })(),
  );
});
