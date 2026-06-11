// Needool service worker — PRD §15.5 PWA offline shell.
// Minimal pattern: cache app shell + static assets, fall back to a cached
// offline page when network fails. No external deps (no Workbox) so we stay
// out of the build pipeline.

const SHELL_CACHE = "needool-shell-v1";
const RUNTIME_CACHE = "needool-runtime-v1";
const ASSET_CACHE = "needool-assets-v1";
const OFFLINE_URL = "/offline.html";

// Phase 10-2 — Vite emits content-addressed files under /assets/* with hashed
// names (e.g. index-B4FQtGHO.js). Hashed names make stale-while-revalidate
// safe: when content changes, the URL changes, so the old cache entry simply
// becomes unreachable instead of stale. Repeat visits load near-instantly.
const ASSET_RE = /\/assets\/[^/]+\.(js|mjs|css|woff2?|ttf|otf|svg|webp|png|jpg|jpeg|gif|avif)$/;

const SHELL_ASSETS = [
  "/",
  "/offline.html",
  "/favicon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // Best-effort: don't fail install if any asset 404s.
    for (const url of SHELL_ASSETS) {
      try { await cache.add(url); } catch (e) { /* skip */ }
    }
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((n) => n !== SHELL_CACHE && n !== RUNTIME_CACHE && n !== ASSET_CACHE)
      .map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

// Network-first for navigation; cache-first for static; bypass all API + auth.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Never intercept API or auth traffic.
  if (url.pathname.startsWith("/api/")) return;
  if (url.hostname.includes("clerk")) return;
  if (url.hostname.includes("supabase")) return;

  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(req, fresh.clone()).catch(() => {});
        return fresh;
      } catch (e) {
        const cached = await caches.match(req);
        if (cached) return cached;
        return (await caches.match(OFFLINE_URL))
          || new Response("Offline", { status: 503, headers: { "content-type": "text/plain" } });
      }
    })());
    return;
  }

  // Phase 10-2 — Hashed /assets/* get true stale-while-revalidate: respond
  // immediately from cache (sub-frame instant on repeat visits), and refresh
  // in the background. Safe because Vite's content-addressed names mean a
  // new build = new URL.
  if (url.origin === self.location.origin && ASSET_RE.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(ASSET_CACHE);
      const cached = await cache.match(req);
      const networkPromise = fetch(req)
        .then((fresh) => {
          // Only cache successful, basic responses (avoid caching opaque 0-status).
          if (fresh && fresh.status === 200) {
            cache.put(req, fresh.clone()).catch(() => {});
          }
          return fresh;
        })
        .catch(() => null);
      if (cached) {
        // Kick the network refresh but don't await it.
        networkPromise.catch(() => {});
        return cached;
      }
      const fresh = await networkPromise;
      return fresh || Response.error();
    })());
    return;
  }

  // Other static + same-origin asset: cache-first with background refresh.
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(req, fresh.clone()).catch(() => {});
        return fresh;
      } catch (e) {
        return cached || Response.error();
      }
    })());
  }
});

// PRD §12 push channel scaffold. The push payload is JSON-encoded as
// `{ title, body, url }` once a launch-time sender is wired up. Until then
// this branch is dormant but ready.
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try { payload = event.data.json(); } catch (e) { payload = { body: event.data.text() }; }
  const title = payload.title || "Needool";
  const body = payload.body || "";
  const url = payload.url || "/";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of all) {
      if (client.url.includes(url) && "focus" in client) return client.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  })());
});
