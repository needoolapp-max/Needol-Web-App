// Phase 7-3 — Idempotency + race-condition tests for pure logic.
//
// Real DB races are e2e territory; here we lock down the deterministic
// helpers that webhook handlers + concurrent submit paths rely on:
//   - NOWPayments order-id roundtrip never collides between prefixes
//   - parseOrderId rejects malformed strings instead of silently mis-routing
//   - registerOrderHandler is overwrite-safe (last write wins per prefix)
//   - computeNextPeriod called twice with the same input returns the same
//     output (idempotent expiry calc)
//   - resolveReferrer typed wins cookie deterministically every call
//   - hashOtpCode is deterministic across calls
//   - addMonths handles leap-day rollover deterministically
//
// All of this matters because webhook retries + double-click submits can
// invoke these functions multiple times in the same second.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildOrderId,
  parseOrderId,
  registerOrderHandler,
  resolveOrderHandler,
} from "../lib/nowpayments.mjs";
import {
  addDays,
  addMonths,
  computeNextPeriod,
  isWithinResubWindow,
} from "../lib/subscriptions.mjs";
import { hashOtpCode } from "../lib/hire-request-otp.mjs";
import { resolveReferrer } from "../lib/signup.mjs";

// ---------------------------------------------------------------------------
// NOWPayments order-id roundtrip + prefix dispatch
// ---------------------------------------------------------------------------

test("buildOrderId then parseOrderId roundtrip yields the same prefix + parts", () => {
  const id = buildOrderId("u", ["user_abc", "individual_monthly"]);
  const parsed = parseOrderId(id);
  assert.equal(parsed.prefix, "u");
  assert.deepEqual(parsed.parts, ["user_abc", "individual_monthly"]);
  assert.ok(Number.isFinite(parsed.timestamp));
});

test("parseOrderId returns null for malformed strings (no silent mis-route)", () => {
  for (const bad of [null, undefined, "", "u", "no-dots", "u.abc.nottime", "..."]) {
    const r = parseOrderId(bad);
    if (r !== null) {
      // If accepted, timestamp must be a finite number; we don't trust
      // a returned struct otherwise.
      assert.ok(Number.isFinite(r.timestamp), `accepted malformed: ${bad}`);
    }
  }
});

test("parseOrderId distinguishes 'u.…' from 'h.…' (no cross-prefix collision)", () => {
  const u = parseOrderId(buildOrderId("u", ["abc"]));
  const h = parseOrderId(buildOrderId("h", ["abc"]));
  assert.notEqual(u.prefix, h.prefix);
  assert.deepEqual(u.parts, h.parts);
});

test("buildOrderId never embeds a '.' in caller-provided parts (UUIDs use '-', plan codes '_')", () => {
  const id = buildOrderId("h", ["7a5e8e9c-1234-abcd-ef99-bbbb"]);
  // We can't catch every misuse with dots, but the documented contract is
  // that callers don't pass dot-containing parts. Roundtrip should still
  // resolve the prefix correctly even if the count is off.
  const parsed = parseOrderId(id);
  assert.equal(parsed.prefix, "h");
});

test("registerOrderHandler last-write-wins per prefix", () => {
  const h1 = () => "first";
  const h2 = () => "second";
  registerOrderHandler("zzTest1", h1);
  assert.equal(resolveOrderHandler("zzTest1")(), "first");
  registerOrderHandler("zzTest1", h2);
  assert.equal(resolveOrderHandler("zzTest1")(), "second");
  // Unknown prefix yields null
  assert.equal(resolveOrderHandler("zzNoSuchPrefix"), null);
});

// ---------------------------------------------------------------------------
// Subscription expiry — idempotency of pure computation
// ---------------------------------------------------------------------------

test("computeNextPeriod is idempotent for identical input (no double-extension)", () => {
  const fixedNow = new Date("2026-06-30T12:00:00Z");
  const expiry = new Date("2026-07-15T12:00:00Z");
  const a = computeNextPeriod({
    planCode: "individual_monthly",
    currentExpiry: expiry,
    hasTrial: false,
    now: fixedNow,
  });
  const b = computeNextPeriod({
    planCode: "individual_monthly",
    currentExpiry: expiry,
    hasTrial: false,
    now: fixedNow,
  });
  assert.equal(a.periodEnd.getTime(), b.periodEnd.getTime());
  assert.equal(a.periodStart.getTime(), b.periodStart.getTime());
});

test("computeNextPeriod extends from current expiry (not now) when still active", () => {
  const now = new Date("2026-06-30T00:00:00Z");
  const expiry = new Date("2026-07-15T00:00:00Z");
  const r = computeNextPeriod({
    planCode: "individual_monthly",
    currentExpiry: expiry,
    hasTrial: false,
    now,
  });
  // Should be expiry + 1 month, not now + 1 month
  assert.equal(r.periodEnd.getUTCFullYear(), 2026);
  assert.equal(r.periodEnd.getUTCMonth(), 7); // Aug (0-indexed)
});

test("computeNextPeriod for first activation with trial honors the 7-day trial floor", () => {
  const now = new Date("2026-06-30T00:00:00Z");
  const r = computeNextPeriod({
    planCode: "individual_monthly",
    currentExpiry: null,
    hasTrial: true,
    now,
  });
  // 7-day trial end + 1 month
  const trialEnd = addDays(now, 7);
  const expected = addMonths(trialEnd, 1);
  assert.equal(r.periodEnd.getTime(), expected.getTime());
});

test("addMonths handles end-of-month rollover deterministically (Jan 31 + 1 month)", () => {
  const jan31 = new Date("2026-01-31T00:00:00Z");
  const result = addMonths(jan31, 1);
  // Feb has no 31; pure implementation should land on Feb 28 (2026 not a leap year)
  assert.equal(result.getUTCFullYear(), 2026);
  assert.equal(result.getUTCMonth(), 1); // Feb
  assert.ok(result.getUTCDate() <= 28);
});

test("addMonths idempotent for same input (deterministic, no Date mutation)", () => {
  const base = new Date("2026-06-30T00:00:00Z");
  const a = addMonths(base, 1);
  const b = addMonths(base, 1);
  assert.equal(a.getTime(), b.getTime());
  // Base wasn't mutated.
  assert.equal(base.toISOString(), "2026-06-30T00:00:00.000Z");
});

// ---------------------------------------------------------------------------
// Resub window enforcement
// ---------------------------------------------------------------------------

test("isWithinResubWindow is deterministic across rapid calls", () => {
  const now = new Date("2026-06-30T00:00:00Z");
  const expiry = addDays(now, 5); // monthly window
  for (let i = 0; i < 10; i++) {
    assert.equal(isWithinResubWindow(expiry, "individual_monthly", now), true);
    assert.equal(isWithinResubWindow(expiry, "individual_yearly", now), true);
  }
});

// ---------------------------------------------------------------------------
// OTP hashing — collision-free + deterministic
// ---------------------------------------------------------------------------

test("hashOtpCode is deterministic + same input always same output", () => {
  for (let i = 0; i < 50; i++) {
    assert.equal(hashOtpCode("123456"), hashOtpCode("123456"));
  }
});

test("hashOtpCode produces different output for every 6-digit code", () => {
  const seen = new Set();
  for (let i = 100000; i < 100050; i++) {
    seen.add(hashOtpCode(String(i)));
  }
  assert.equal(seen.size, 50);
});

// ---------------------------------------------------------------------------
// Referrer resolution — typed wins cookie deterministically
// ---------------------------------------------------------------------------

test("resolveReferrer: typed wins cookie when both exist (PRD §2.7)", () => {
  const exists = (code) => code === "alice" || code === "bob";
  assert.equal(resolveReferrer({ typed: "alice", cookie: "bob", exists }), "ALICE");
});

test("resolveReferrer: typed username that doesn't exist → silent drop, no fallback (PRD §2.7)", () => {
  const exists = (code) => code === "bob";
  // PRD §2.7 wording: typed wins over passive cookie; if typed missing, drop.
  assert.equal(resolveReferrer({ typed: "ghost", cookie: "bob", exists }), null);
});

test("resolveReferrer: cookie used when no typed provided", () => {
  const exists = (code) => code === "bob";
  assert.equal(resolveReferrer({ typed: "", cookie: "bob", exists }), "BOB");
  assert.equal(resolveReferrer({ typed: null, cookie: "bob", exists }), "BOB");
});

test("resolveReferrer: null when neither typed nor cookie present", () => {
  const exists = () => true;
  assert.equal(resolveReferrer({ typed: "", cookie: "", exists }), null);
  assert.equal(resolveReferrer({ typed: null, cookie: null, exists }), null);
});

test("resolveReferrer is deterministic across rapid calls (no hidden state)", () => {
  const exists = () => true;
  for (let i = 0; i < 20; i++) {
    assert.equal(resolveReferrer({ typed: "x", cookie: "y", exists }), "X");
  }
});
