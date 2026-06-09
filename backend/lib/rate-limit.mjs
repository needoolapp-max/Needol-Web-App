// PRD §15.4 — Rate limiting on write endpoints.
//
// In-process fixed-window counter, keyed on `${clientIp}:${bucket}`. Adequate
// for a single backend dyno (Render starter plan). For multi-dyno scale-out,
// swap the Map for a Redis/Upstash backed counter — the API in this file
// stays the same.
//
// Three tiers (the route registry picks one per endpoint):
//   • strict — 5  reqs / 15 minutes — OTP request + verify, webhooks
//   • write  — 30 reqs / 1  minute  — all other public POST/PATCH/DELETE
//   • read   — 120 reqs / 1 minute  — public GETs
//
// Returns { allowed, remaining, retryAfterSec, resetAt }.

const buckets = new Map();
let cleanupTimer = null;

export const TIERS = {
  strict: { windowMs: 15 * 60 * 1000, max: 5 },
  write:  { windowMs:      60 * 1000, max: 30 },
  read:   { windowMs:      60 * 1000, max: 120 },
};

function ensureCleanup() {
  // GC expired buckets every minute. Bound the Map size in long-lived dynos.
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of buckets) {
      if (entry.resetAt <= now) buckets.delete(key);
    }
  }, 60_000);
  // Don't keep the event loop alive just for the GC timer.
  if (typeof cleanupTimer.unref === "function") cleanupTimer.unref();
}

export function clientIp(req) {
  // Prefer Cloudflare/Render forwarded headers; fall back to socket.
  const cf = req.headers["cf-connecting-ip"];
  if (typeof cf === "string" && cf.trim()) return cf.trim();
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) {
    return xff.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

// Tier helper — pure so it's easy to unit-test the matrix.
export function tierFor({ method, path }) {
  if (path.startsWith("/api/hire-requests/otp/")) return "strict";
  if (path.startsWith("/api/webhooks/")) return "strict";
  if (path.startsWith("/api/withdrawals")) return "strict";
  if (path.startsWith("/api/auth/")) return "strict";
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return "read";
  return "write";
}

export function consume({ key, tier = "write", now = Date.now() }) {
  ensureCleanup();
  const cfg = TIERS[tier] || TIERS.write;
  const entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    const resetAt = now + cfg.windowMs;
    buckets.set(key, { count: 1, resetAt, max: cfg.max });
    return {
      allowed: true,
      remaining: cfg.max - 1,
      retryAfterSec: 0,
      resetAt,
      tier,
    };
  }
  if (entry.count >= cfg.max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
      resetAt: entry.resetAt,
      tier,
    };
  }
  entry.count += 1;
  return {
    allowed: true,
    remaining: cfg.max - entry.count,
    retryAfterSec: 0,
    resetAt: entry.resetAt,
    tier,
  };
}

// Test-only — clears the in-memory store.
export function _resetForTests() {
  buckets.clear();
}
