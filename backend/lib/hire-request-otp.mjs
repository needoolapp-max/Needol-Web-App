// PRD §8.1 — Hire-request contact-email OTP.
// Pure logic. IO lives in hire-request-otp-store.mjs.
//
// Flow:
//   1. Frontend POSTs { email } → backend issues a 6-digit code with 15-min TTL,
//      stores sha-256(code) in hire_request_otps, sends the code via Resend
//      (or no-ops with a console log in dev when the key is absent).
//   2. Frontend POSTs { email, code } → backend marks the row consumed and
//      returns a short-lived verification id.
//   3. Frontend POSTs the hire-request form with otp_verification_id; backend
//      re-checks the id is consumed + not expired + email matches before insert.

import { createHash, randomInt } from "node:crypto";

export const OTP_TTL_MIN = 15;
export const OTP_VERIFICATION_TTL_MIN = 30; // window between verify → submit
export const OTP_MAX_ATTEMPTS = 5;

export class OtpError extends Error {
  constructor(status, message, field) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

export function generateOtpCode() {
  // 6-digit, no leading-zero bias.
  return String(randomInt(100000, 1000000));
}

export function hashOtpCode(code) {
  return createHash("sha256").update(String(code), "utf8").digest("hex");
}

export function pickOtpRequest(input = {}) {
  const email = String(input.email || "").trim().toLowerCase();
  if (!email) throw new OtpError(400, "email is required.", "email");
  if (!email.includes("@") || !email.includes(".")) {
    throw new OtpError(400, "email must be a valid email address.", "email");
  }
  if (email.length > 320) {
    throw new OtpError(400, "email is too long.", "email");
  }
  return { email };
}

export function pickOtpVerify(input = {}) {
  const email = String(input.email || "").trim().toLowerCase();
  const code = String(input.code || "").trim();
  if (!email) throw new OtpError(400, "email is required.", "email");
  if (!/^\d{6}$/.test(code)) throw new OtpError(400, "code must be a 6-digit number.", "code");
  return { email, code };
}

export function otpExpiryDate(now = new Date(), ttlMinutes = OTP_TTL_MIN) {
  const d = new Date(now);
  d.setUTCMinutes(d.getUTCMinutes() + ttlMinutes);
  return d;
}

export function isOtpExpired(row, now = new Date()) {
  if (!row || !row.expires_at) return true;
  return new Date(row.expires_at).getTime() <= now.getTime();
}

export function isVerificationStillValid(row, now = new Date()) {
  if (!row || !row.consumed_at) return false;
  const cutoff = new Date(row.consumed_at);
  cutoff.setUTCMinutes(cutoff.getUTCMinutes() + OTP_VERIFICATION_TTL_MIN);
  return cutoff.getTime() > now.getTime();
}
