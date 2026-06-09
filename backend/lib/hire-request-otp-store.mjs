// PRD §8.1 — Hire-request OTP IO. Pure logic lives in hire-request-otp.mjs.

import { insertRow, selectOne, updateRows } from "./supabase.mjs";
import { sendEmail } from "./email-sender.mjs";
import {
  OTP_MAX_ATTEMPTS,
  OtpError,
  generateOtpCode,
  hashOtpCode,
  isOtpExpired,
  isVerificationStillValid,
  otpExpiryDate,
} from "./hire-request-otp.mjs";

export async function issueOtp({ email }) {
  const code = generateOtpCode();
  const expiresAt = otpExpiryDate();
  const row = await insertRow(
    "hire_request_otps",
    {
      email,
      code_hash: hashOtpCode(code),
      expires_at: expiresAt.toISOString(),
    },
    { returning: "representation" },
  );
  await sendEmail({
    to: email,
    subject: "Your Needool hire-request verification code",
    text:
      `Your Needool hire-request verification code is ${code}. ` +
      `It expires in 15 minutes. If you didn't request this, ignore this email.`,
    html:
      `<p>Your Needool hire-request verification code is <strong>${code}</strong>.</p>` +
      `<p>It expires in 15 minutes. If you didn't request this, ignore this email.</p>`,
  });
  // Returning the otp id only — never the raw code — keeps the contract safe
  // even if the response body leaks. In dev (no Resend key) the sendEmail()
  // path logs the code to the backend console so testers can pick it up.
  return { id: row?.id, expiresAt: expiresAt.toISOString(), email };
}

async function findLatestOpenOtp({ email }) {
  return selectOne(
    "hire_request_otps",
    `email=eq.${encodeURIComponent(email)}&consumed_at=is.null&order=created_at.desc&select=*`,
  );
}

export async function verifyOtp({ email, code }) {
  const row = await findLatestOpenOtp({ email });
  if (!row) throw new OtpError(404, "No pending OTP for this email.", "email");
  if (isOtpExpired(row)) {
    throw new OtpError(410, "OTP has expired. Request a new code.", "code");
  }
  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    throw new OtpError(429, "Too many attempts. Request a new code.", "code");
  }
  if (row.code_hash !== hashOtpCode(code)) {
    await updateRows(
      "hire_request_otps",
      `id=eq.${encodeURIComponent(row.id)}`,
      { attempts: row.attempts + 1 },
    );
    throw new OtpError(400, "Incorrect code.", "code");
  }
  const consumedAt = new Date().toISOString();
  await updateRows(
    "hire_request_otps",
    `id=eq.${encodeURIComponent(row.id)}`,
    { consumed_at: consumedAt, attempts: row.attempts + 1 },
  );
  return { id: row.id, email, consumedAt };
}

export async function loadVerification({ id, email }) {
  if (!id) return null;
  return selectOne(
    "hire_request_otps",
    `id=eq.${encodeURIComponent(id)}&email=eq.${encodeURIComponent(email)}&select=*`,
  );
}

export async function assertVerificationConsumed({ id, email }) {
  const row = await loadVerification({ id, email });
  if (!row) throw new OtpError(400, "Email verification not found. Verify your email and resubmit.", "email");
  if (!row.consumed_at) {
    throw new OtpError(400, "Email verification not completed.", "email");
  }
  if (!isVerificationStillValid(row)) {
    throw new OtpError(410, "Email verification expired. Re-verify your email.", "email");
  }
  return row;
}
