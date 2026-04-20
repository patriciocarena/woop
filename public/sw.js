/**
 * Woop service worker — bumped via CACHE_VERSION.
 *
 * Strategies:
 *  - Same-origin GET navigations: network-first, fall back to cached /today shell.
 *  - Same-origin GET static assets (JS/CSS/images/fonts): stale-while-revalidate.
 *  - Everything else (POST, cross-origin, /api/*): passthrough — no cache.
 */

const CACHE_VERSION = "v1";
const SHELL_CACHE = `woop-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `woop-assets-${CACHE_VERSION}`;
const SHELL_FALLBACK = "/today";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.add(SHELL_FALLBACK)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(SHELL_CACHE);
        cache.put(SHELL_FALLBACK, fresh.clone()).catch(() => {});
        return fresh;
      } catch {
        const cache = await caches.open(SHELL_CACHE);
        const cached = await cache.match(SHELL_FALLBACK);
        return cached || Response.error();
      }
    })());
    return;
  }

  // Static assets: stale-while-revalidate.
  if (/\.(?:js|css|woff2?|svg|png|jpg|jpeg|webp|ico)$/.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(ASSET_CACHE);
      const cached = await cache.match(req);
      const networkPromise = fetch(req).then((resp) => {
        if (resp.ok) cache.put(req, resp.clone()).catch(() => {});
        return resp;
      }).catch(() => cached);
      return cached || networkPromise;
    })());
  }
});
