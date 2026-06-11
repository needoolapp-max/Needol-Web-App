// PRD §15.4 — CSRF double-submit token, signed.
//
// Pattern (current OWASP cheat sheet, 2026):
//   • On every GET response, server sets a `ndl_csrf` cookie (Secure,
//     SameSite=Strict, NOT HttpOnly so JS can mirror it into a header).
//   • Cookie value is `${nonce}:${hmac}` where hmac is
//     HMAC-SHA-256 over `${nonce}|${bearerOrAnonSubject}`.
//   • State-changing requests (POST/PATCH/DELETE) MUST send the same
//     value in the `x-csrf-token` header. Server re-derives the HMAC
//     and rejects with 403 on mismatch.
//
// This protects PRD-§15.4-mandated double-submit even when the bearer is
// in localStorage and the attacker can't read it cross-origin. The
// signature ties the token to the caller's bearer / session so a CSRF
// attacker can't simply set a cookie + send a matching header.

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const CSRF_COOKIE = "ndl_csrf";
const CSRF_HEADER = "x-csrf-token";
const NONCE_BYTES = 24;

// Resolved at first use so tests can override the secret via env.
function csrfSecret() {
  return process.env.CSRF_SECRET
      || process.env.CLERK_WEBHOOK_SECRET  // fall back to an existing secret in dev
      || "needool-dev-csrf-secret-do-not-use-in-production";
}

function signNonce(nonce, subject) {
  return createHmac("sha256", csrfSecret())
    .update(`${nonce}|${subject || "anon"}`)
    .digest("hex");
}

export function issueCsrfToken({ subject } = {}) {
  const nonce = randomBytes(NONCE_BYTES).toString("base64url");
  const hmac = signNonce(nonce, subject);
  return `${nonce}:${hmac}`;
}

export function parseCsrfToken(token) {
  if (typeof token !== "string") return null;
  const idx = token.indexOf(":");
  if (idx <= 0) return null;
  const nonce = token.slice(0, idx);
  const hmac = token.slice(idx + 1);
  if (!nonce || !hmac) return null;
  return { nonce, hmac };
}

export function isCsrfTokenValid(token, { subject } = {}) {
  const parsed = parseCsrfToken(token);
  if (!parsed) return false;
  const expected = signNonce(parsed.nonce, subject);
  // Constant-time compare to avoid hmac-leak via timing.
  const a = Buffer.from(parsed.hmac);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try { return timingSafeEqual(a, b); } catch { return false; }
}

export function readCookie(req, name) {
  const raw = req.headers.cookie;
  if (typeof raw !== "string") return null;
  for (const part of raw.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    if (k === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

// Returns the set-cookie value for the CSRF token. The frontend reads it
// directly via document.cookie and mirrors it in the x-csrf-token header.
//
// `domain` widens the cookie so it is readable from sibling subdomains.
// Production hosts the SPA at needool.com and the API at api.needool.com;
// without Domain=.needool.com, document.cookie on the SPA cannot see the
// cookie set by the API, the x-csrf-token header is never sent, and every
// mutation 403s with "missing-header". Pass Domain=.<registrable-domain>
// in prod via CSRF_COOKIE_DOMAIN env. Leave unset for localhost (browsers
// reject Domain= for single-label hosts anyway).
export function buildCsrfCookie(token, { secure = true, domain } = {}) {
  const flags = [
    `${CSRF_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "SameSite=Strict",
    "Max-Age=86400",
  ];
  if (domain) flags.push(`Domain=${domain}`);
  if (secure) flags.push("Secure");
  return flags.join("; ");
}

export { CSRF_COOKIE, CSRF_HEADER };

// Pure check used by the request middleware. Returns
//   { ok, reason } where reason is one of: missing-header, missing-cookie,
//   mismatch, invalid-signature.
export function checkCsrf({ req, subject }) {
  const header = req.headers[CSRF_HEADER];
  if (!header || typeof header !== "string") {
    return { ok: false, reason: "missing-header" };
  }
  const cookie = readCookie(req, CSRF_COOKIE);
  if (!cookie) return { ok: false, reason: "missing-cookie" };
  if (header !== cookie) return { ok: false, reason: "mismatch" };
  if (!isCsrfTokenValid(header, { subject })) {
    return { ok: false, reason: "invalid-signature" };
  }
  return { ok: true };
}
