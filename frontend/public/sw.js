// Needool service worker — PRD §15.5 PWA offline shell.
// Minimal pattern: cache app shell + static assets, fall back to a cached
// offline page when network fails. No external deps (no Workbox) so we stay
// out of the build pipeline.

const SHELL_CACHE = "needool-shell-v1";
const RUNTIME_CACHE = "needool-runtime-v1";
const OFFLINE_URL = "/offline.html";

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
      .filter((n) => n !== SHELL_CACHE && n !== RUNTIME_CACHE)
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

  // Static + same-origin asset: cache-first with background refresh.
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
