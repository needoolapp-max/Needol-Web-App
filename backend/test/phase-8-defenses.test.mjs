// Phase 8 — pure-logic tests for every security defense.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  TIERS,
  _resetForTests,
  consume,
  tierFor,
} from "../lib/rate-limit.mjs";
import {
  buildCsrfCookie,
  checkCsrf,
  isCsrfTokenValid,
  issueCsrfToken,
  parseCsrfToken,
} from "../lib/csrf.mjs";
import {
  WEBHOOK_TIMESTAMP_TOLERANCE_MS,
  isWebhookFresh,
} from "../lib/clerk.mjs";
import {
  PUSH_ALLOWED_HOSTS,
  PushSubError,
  isAllowedPushEndpoint,
  pickPushSubscription,
} from "../lib/push-subscriptions.mjs";
import {
  UrlSafetyError,
  assertUrlSafe,
  checkUrlSafety,
} from "../lib/url-safety.mjs";
import {
  ReviewError,
  validateReplyInput,
} from "../lib/reviews.mjs";

// ---------------------------------------------------------------------------
// 8-2 — Rate limiter
// ---------------------------------------------------------------------------

test("rate-limit: tierFor routes OTP + webhooks + auth + withdrawals → strict", () => {
  assert.equal(tierFor({ method: "POST", path: "/api/hire-requests/otp/request" }), "strict");
  assert.equal(tierFor({ method: "POST", path: "/api/hire-requests/otp/verify" }), "strict");
  assert.equal(tierFor({ method: "POST", path: "/api/webhooks/clerk" }), "strict");
  assert.equal(tierFor({ method: "POST", path: "/api/withdrawals" }), "strict");
  assert.equal(tierFor({ method: "POST", path: "/api/auth/whatever" }), "strict");
});

test("rate-limit: GETs map to 'read', POSTs to 'write'", () => {
  assert.equal(tierFor({ method: "GET", path: "/api/posts" }), "read");
  assert.equal(tierFor({ method: "POST", path: "/api/posts" }), "write");
  assert.equal(tierFor({ method: "PATCH", path: "/api/posts/123" }), "write");
});

test("rate-limit: bucket allows up to max, then blocks the next request", () => {
  _resetForTests();
  const key = "test:strict:/api/test";
  for (let i = 0; i < TIERS.strict.max; i++) {
    const r = consume({ key, tier: "strict" });
    assert.equal(r.allowed, true);
  }
  const blocked = consume({ key, tier: "strict" });
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSec > 0);
});

test("rate-limit: separate keys never share a bucket", () => {
  _resetForTests();
  for (let i = 0; i < TIERS.write.max; i++) {
    assert.equal(consume({ key: "ip1:write:/x", tier: "write" }).allowed, true);
  }
  // ip2 has its own bucket.
  assert.equal(consume({ key: "ip2:write:/x", tier: "write" }).allowed, true);
});

test("rate-limit: window resets after windowMs", () => {
  _resetForTests();
  const key = "test:write:/api/test";
  // Burn the entire window.
  for (let i = 0; i < TIERS.write.max; i++) consume({ key, tier: "write", now: 1000 });
  const blocked = consume({ key, tier: "write", now: 1000 });
  assert.equal(blocked.allowed, false);
  // Past the window — fresh bucket.
  const fresh = consume({ key, tier: "write", now: 1000 + TIERS.write.windowMs + 1 });
  assert.equal(fresh.allowed, true);
});

// ---------------------------------------------------------------------------
// 8-3 — Webhook freshness
// ---------------------------------------------------------------------------

test("webhook: isWebhookFresh accepts now ± 5 min", () => {
  const now = 1_700_000_000_000;
  const tsNow = Math.floor(now / 1000);
  assert.equal(isWebhookFresh(tsNow, now), true);
  assert.equal(isWebhookFresh(tsNow - 4 * 60, now), true);
  assert.equal(isWebhookFresh(tsNow + 4 * 60, now), true);
});

test("webhook: rejects timestamps beyond 5-minute window", () => {
  const now = 1_700_000_000_000;
  const tsNow = Math.floor(now / 1000);
  assert.equal(isWebhookFresh(tsNow - 6 * 60, now), false);
  assert.equal(isWebhookFresh(tsNow + 6 * 60, now), false);
});

test("webhook: rejects garbage / negative / missing timestamps", () => {
  assert.equal(isWebhookFresh(null), false);
  assert.equal(isWebhookFresh(undefined), false);
  assert.equal(isWebhookFresh("not-a-number"), false);
  assert.equal(isWebhookFresh(-1), false);
  assert.equal(isWebhookFresh(0), false);
});

test("webhook: WEBHOOK_TIMESTAMP_TOLERANCE_MS is 5 minutes", () => {
  assert.equal(WEBHOOK_TIMESTAMP_TOLERANCE_MS, 5 * 60 * 1000);
});

// ---------------------------------------------------------------------------
// 8-5 — CSRF double-submit
// ---------------------------------------------------------------------------

test("csrf: issueCsrfToken → parseCsrfToken roundtrip", () => {
  const tok = issueCsrfToken({ subject: "alice" });
  const parsed = parseCsrfToken(tok);
  assert.ok(parsed);
  assert.ok(parsed.nonce.length > 16);
  assert.equal(parsed.hmac.length, 64); // sha256 hex
});

test("csrf: signature is bound to the subject — different subjects → invalid", () => {
  const tok = issueCsrfToken({ subject: "alice" });
  assert.equal(isCsrfTokenValid(tok, { subject: "alice" }), true);
  assert.equal(isCsrfTokenValid(tok, { subject: "mallory" }), false);
});

test("csrf: malformed tokens return false instead of throwing", () => {
  assert.equal(isCsrfTokenValid("", { subject: "x" }), false);
  assert.equal(isCsrfTokenValid("notoken", { subject: "x" }), false);
  assert.equal(isCsrfTokenValid("nonce:", { subject: "x" }), false);
  assert.equal(isCsrfTokenValid(":hmac", { subject: "x" }), false);
});

test("csrf: checkCsrf rejects missing header, missing cookie, mismatch, bad signature", () => {
  const tok = issueCsrfToken({ subject: "alice" });
  // missing header
  assert.deepEqual(
    checkCsrf({ req: { headers: { cookie: `ndl_csrf=${tok}` } }, subject: "alice" }),
    { ok: false, reason: "missing-header" },
  );
  // missing cookie
  assert.deepEqual(
    checkCsrf({ req: { headers: { "x-csrf-token": tok } }, subject: "alice" }),
    { ok: false, reason: "missing-cookie" },
  );
  // mismatch
  const otherTok = issueCsrfToken({ subject: "alice" });
  assert.deepEqual(
    checkCsrf({
      req: { headers: { "x-csrf-token": tok, cookie: `ndl_csrf=${otherTok}` } },
      subject: "alice",
    }),
    { ok: false, reason: "mismatch" },
  );
});

test("csrf: checkCsrf accepts matching signed token + cookie", () => {
  const tok = issueCsrfToken({ subject: "alice" });
  const r = checkCsrf({
    req: { headers: { "x-csrf-token": tok, cookie: `ndl_csrf=${tok}` } },
    subject: "alice",
  });
  assert.deepEqual(r, { ok: true });
});

test("csrf: buildCsrfCookie sets SameSite=Strict + HttpOnly-less + Secure in prod", () => {
  const cookie = buildCsrfCookie("abc", { secure: true });
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Path=\//);
  assert.match(cookie, /Secure/);
  // NOT HttpOnly (JS needs to read it for the double-submit).
  assert.doesNotMatch(cookie, /HttpOnly/);
});

// ---------------------------------------------------------------------------
// 8-7 — Push host allowlist
// ---------------------------------------------------------------------------

test("push: allowed hosts include the 4 W3C-recognized vendors", () => {
  assert.equal(isAllowedPushEndpoint("https://fcm.googleapis.com/fcm/send/x"), true);
  assert.equal(isAllowedPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/x"), true);
  assert.equal(isAllowedPushEndpoint("https://abc-def.notify.windows.com/w/x"), true);
  assert.equal(isAllowedPushEndpoint("https://web.push.apple.com/x"), true);
});

test("push: attacker-controlled hosts are rejected", () => {
  assert.equal(isAllowedPushEndpoint("https://evil.tld/push"), false);
  assert.equal(isAllowedPushEndpoint("https://fcm.googleapis.com.evil.tld/x"), false);
  // http (not https)
  assert.equal(isAllowedPushEndpoint("http://fcm.googleapis.com/x"), false);
  // missing host
  assert.equal(isAllowedPushEndpoint("https:///foo"), false);
});

test("push: pickPushSubscription throws PushSubError on bad host", () => {
  assert.throws(
    () => pickPushSubscription({
      endpoint: "https://evil.tld/push",
      keys: { p256dh: "a", auth: "b" },
    }),
    (e) => e instanceof PushSubError && e.status === 400,
  );
});

test("push: PUSH_ALLOWED_HOSTS shape is unchanged from the launch list", () => {
  // 4 vendor entries + 1 legacy android.googleapis.com = 5
  assert.equal(PUSH_ALLOWED_HOSTS.length, 5);
});

// ---------------------------------------------------------------------------
// 8-8 — SSRF-safe URL validator
// ---------------------------------------------------------------------------

test("url-safety: rejects private IPv4 ranges", () => {
  for (const u of [
    "http://10.0.0.1/x", "http://127.0.0.1/", "http://169.254.169.254/latest/meta-data/",
    "http://172.16.0.1/", "http://172.20.5.5/", "http://192.168.1.1/",
    "http://100.64.0.1/", "http://0.0.0.0/", "http://224.0.0.1/",
  ]) {
    assert.equal(checkUrlSafety(u).ok, false, `should reject ${u}`);
  }
});

test("url-safety: rejects blocked schemes", () => {
  for (const u of [
    "javascript:alert(1)", "data:text/html,x", "file:///etc/passwd",
    "ftp://x.tld/", "gopher://x/", "vbscript:msgbox(1)", "blob:x",
  ]) {
    assert.equal(checkUrlSafety(u).ok, false, `should reject ${u}`);
  }
});

test("url-safety: rejects metadata hostnames", () => {
  assert.equal(checkUrlSafety("http://metadata.google.internal/x").ok, false);
  assert.equal(checkUrlSafety("http://metadata/x").ok, false);
  assert.equal(checkUrlSafety("http://localhost/").ok, false);
});

test("url-safety: rejects .local / .internal / .localhost suffixes", () => {
  assert.equal(checkUrlSafety("http://router.local/").ok, false);
  assert.equal(checkUrlSafety("http://service.internal/").ok, false);
});

test("url-safety: rejects embedded credentials in URL", () => {
  assert.equal(checkUrlSafety("https://user:pass@example.com/").ok, false);
});

test("url-safety: rejects IPv6 literals", () => {
  assert.equal(checkUrlSafety("http://[::1]/").ok, false);
  assert.equal(checkUrlSafety("http://[fe80::1]/").ok, false);
});

test("url-safety: accepts ordinary https URLs", () => {
  assert.equal(checkUrlSafety("https://example.com/path").ok, true);
  assert.equal(checkUrlSafety("https://needool.com").ok, true);
  assert.equal(checkUrlSafety("http://example.com").ok, true);
});

test("url-safety: assertUrlSafe throws UrlSafetyError on rejection", () => {
  assert.throws(() => assertUrlSafe("http://localhost/"), (e) => e instanceof UrlSafetyError);
  assertUrlSafe("https://example.com/"); // does not throw
});

// 8-8 — reply evidence URLs also go through the SSRF gate
test("reviews: validateReplyInput rejects evidence URLs targeting localhost / private IPs", () => {
  for (const evil of [
    "http://localhost/proof", "http://127.0.0.1/proof",
    "http://10.0.0.1/proof", "http://192.168.1.1/proof",
    "http://169.254.169.254/proof",
  ]) {
    assert.throws(
      () => validateReplyInput({ body: "x", evidenceUrl: evil }),
      (e) => e instanceof ReviewError,
      `should reject ${evil}`,
    );
  }
});
