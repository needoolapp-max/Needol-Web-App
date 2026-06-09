// PRD §12 push + §15.5 PWA — push subscription validation. IO lives in
// push-subscriptions-store.mjs.

export class PushSubError extends Error {
  constructor(status, message, field) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

// Phase 8-7 — push endpoint host allowlist. Only the four canonical W3C
// Push Service hosts are accepted. Any other URL (which would be an
// attacker-controlled receiver) is rejected upfront so a stolen bearer
// can't redirect another user's notifications to an external sink.
//
// Sources (W3C-recognized vendors as of 2026):
//   Google FCM   — fcm.googleapis.com (+ legacy android.googleapis.com)
//   Mozilla      — *.push.services.mozilla.com (Firefox)
//   Microsoft    — *.notify.windows.com (Edge / Windows)
//   Apple        — web.push.apple.com (Safari 16.4+)
export const PUSH_ALLOWED_HOSTS = [
  /^fcm\.googleapis\.com$/i,
  /^android\.googleapis\.com$/i,
  /^[a-z0-9-]+\.push\.services\.mozilla\.com$/i,
  /^[a-z0-9-]+\.notify\.windows\.com$/i,
  /^web\.push\.apple\.com$/i,
];

export function isAllowedPushEndpoint(endpoint) {
  if (typeof endpoint !== "string") return false;
  let url;
  try { url = new URL(endpoint); } catch { return false; }
  if (url.protocol !== "https:") return false;
  return PUSH_ALLOWED_HOSTS.some((re) => re.test(url.hostname));
}

// Validate a W3C PushSubscription.toJSON() shape. The browser hands back
// `{ endpoint, expirationTime, keys: { p256dh, auth } }`. We accept either
// nested keys or flat top-level keys (some PWA libraries flatten before POST).
export function pickPushSubscription(input = {}) {
  const endpoint = typeof input.endpoint === "string" ? input.endpoint.trim() : "";
  const p256dh = typeof input.p256dh === "string"
    ? input.p256dh.trim()
    : typeof input.keys?.p256dh === "string"
      ? input.keys.p256dh.trim()
      : "";
  const auth = typeof input.auth === "string"
    ? input.auth.trim()
    : typeof input.keys?.auth === "string"
      ? input.keys.auth.trim()
      : "";
  if (!endpoint) throw new PushSubError(400, "endpoint is required.", "endpoint");
  if (!/^https:\/\//i.test(endpoint)) {
    throw new PushSubError(400, "endpoint must be an https:// URL.", "endpoint");
  }
  if (!isAllowedPushEndpoint(endpoint)) {
    throw new PushSubError(
      400,
      "endpoint host is not a recognized W3C Push Service.",
      "endpoint",
    );
  }
  if (!p256dh) throw new PushSubError(400, "keys.p256dh is required.", "p256dh");
  if (!auth) throw new PushSubError(400, "keys.auth is required.", "auth");
  return {
    endpoint,
    p256dh,
    auth,
    user_agent: typeof input.user_agent === "string" ? input.user_agent.slice(0, 500) : null,
  };
}
