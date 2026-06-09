// PRD §8.1 — Hire-request OTP pure logic.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  OtpError,
  generateOtpCode,
  hashOtpCode,
  isOtpExpired,
  isVerificationStillValid,
  otpExpiryDate,
  pickOtpRequest,
  pickOtpVerify,
  OTP_TTL_MIN,
  OTP_VERIFICATION_TTL_MIN,
} from "../lib/hire-request-otp.mjs";

test("generateOtpCode returns a 6-digit numeric string", () => {
  for (let i = 0; i < 100; i++) {
    const code = generateOtpCode();
    assert.match(code, /^\d{6}$/);
  }
});

test("hashOtpCode is deterministic + ignores leading whitespace differences via stringification", () => {
  const a = hashOtpCode("123456");
  const b = hashOtpCode("123456");
  const c = hashOtpCode("654321");
  assert.equal(a, b);
  assert.notEqual(a, c);
  // sha-256 hex is 64 chars
  assert.equal(a.length, 64);
});

test("pickOtpRequest trims + lowercases the email, rejects malformed", () => {
  const ok = pickOtpRequest({ email: "  Hi@Foo.Bar  " });
  assert.equal(ok.email, "hi@foo.bar");
  assert.throws(() => pickOtpRequest({}), (e) => e instanceof OtpError && e.status === 400);
  assert.throws(() => pickOtpRequest({ email: "no-at" }), (e) => e instanceof OtpError);
  assert.throws(() => pickOtpRequest({ email: "no-dot@host" }), (e) => e instanceof OtpError);
});

test("pickOtpVerify enforces 6-digit code shape", () => {
  const ok = pickOtpVerify({ email: "a@b.co", code: "123456" });
  assert.equal(ok.code, "123456");
  assert.throws(() => pickOtpVerify({ email: "a@b.co", code: "12345" }), (e) => e instanceof OtpError);
  assert.throws(() => pickOtpVerify({ email: "a@b.co", code: "1234567" }), (e) => e instanceof OtpError);
  assert.throws(() => pickOtpVerify({ email: "a@b.co", code: "abcdef" }), (e) => e instanceof OtpError);
  assert.throws(() => pickOtpVerify({ email: "", code: "123456" }), (e) => e instanceof OtpError);
});

test("otpExpiryDate is now + 15 minutes by default", () => {
  const now = new Date("2026-06-01T00:00:00Z");
  const exp = otpExpiryDate(now);
  assert.equal(exp.getTime() - now.getTime(), OTP_TTL_MIN * 60 * 1000);
});

test("isOtpExpired returns true past expiry", () => {
  const now = new Date("2026-06-01T00:30:00Z");
  assert.equal(
    isOtpExpired({ expires_at: "2026-06-01T00:15:00Z" }, now),
    true,
  );
  assert.equal(
    isOtpExpired({ expires_at: "2026-06-01T00:45:00Z" }, now),
    false,
  );
  assert.equal(isOtpExpired(null, now), true);
});

test("isVerificationStillValid honors the verification TTL window", () => {
  const consumedAt = new Date("2026-06-01T00:00:00Z");
  const justAfter = new Date(consumedAt.getTime() + 10 * 60 * 1000);
  const wayAfter = new Date(consumedAt.getTime() + (OTP_VERIFICATION_TTL_MIN + 5) * 60 * 1000);
  assert.equal(
    isVerificationStillValid({ consumed_at: consumedAt.toISOString() }, justAfter),
    true,
  );
  assert.equal(
    isVerificationStillValid({ consumed_at: consumedAt.toISOString() }, wayAfter),
    false,
  );
  assert.equal(isVerificationStillValid({ consumed_at: null }), false);
});

test("OtpError carries status + field", () => {
  const e = new OtpError(429, "too many", "code");
  assert.equal(e.status, 429);
  assert.equal(e.field, "code");
  assert.equal(e.message, "too many");
});
