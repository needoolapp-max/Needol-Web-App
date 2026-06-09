import "dotenv/config";
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const localEnvPath = join(here, "..", ".env.local");
if (existsSync(localEnvPath)) {
  loadEnv({ path: localEnvPath, override: true });
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function optional(name, fallback = "") {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

function csv(name, fallback = []) {
  const raw = optional(name, "");
  if (!raw) return fallback;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export const env = {
  NODE_ENV: optional("NODE_ENV", "development"),
  PORT: Number(optional("PORT", "4100")),
  DATA_PROVIDER: optional("DATA_PROVIDER", "local"),

  SUPABASE_URL: optional("SUPABASE_URL", "").replace(/\/$/, ""),
  SUPABASE_SERVICE_ROLE_KEY: optional("SUPABASE_SERVICE_ROLE_KEY", ""),
  SUPABASE_STATE_TABLE: optional("SUPABASE_STATE_TABLE", "needool_app_state"),
  SUPABASE_STATE_KEY: optional("SUPABASE_STATE_KEY", "dummy_store"),

  CLERK_SECRET_KEY: optional("CLERK_SECRET_KEY", ""),
  CLERK_WEBHOOK_SECRET: optional("CLERK_WEBHOOK_SECRET", ""),
  CLERK_PUBLISHABLE_KEY: optional("CLERK_PUBLISHABLE_KEY", ""),
  ADMIN_ALLOWED_EMAILS: csv("ADMIN_ALLOWED_EMAILS", []).map((e) => e.toLowerCase()),

  NOWPAYMENTS_API_KEY: optional("NOWPAYMENTS_API_KEY", ""),
  NOWPAYMENTS_IPN_SECRET: optional("NOWPAYMENTS_IPN_SECRET", ""),
  NOWPAYMENTS_BASE_URL: optional(
    "NOWPAYMENTS_BASE_URL",
    "https://api-sandbox.nowpayments.io/v1",
  ).replace(/\/$/, ""),
  NOWPAYMENTS_IPN_CALLBACK_URL: optional("NOWPAYMENTS_IPN_CALLBACK_URL", ""),
  NOWPAYMENTS_SUCCESS_URL: optional(
    "NOWPAYMENTS_SUCCESS_URL",
    "http://localhost:3000/billing/success",
  ),
  NOWPAYMENTS_CANCEL_URL: optional(
    "NOWPAYMENTS_CANCEL_URL",
    "http://localhost:3000/pricing",
  ),

  RESEND_API_KEY: optional("RESEND_API_KEY", ""),
  RESEND_FROM_EMAIL: optional(
    "RESEND_FROM_EMAIL",
    "Needool <hello@needool.local>",
  ),

  ALLOWED_ORIGINS: csv("ALLOWED_ORIGINS", [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3200",
    "http://127.0.0.1:3200",
  ]),
};

export function requireEnv(name) {
  return required(name);
}

export function isDev() {
  return env.NODE_ENV !== "production";
}

export function isAdminEmail(email) {
  if (!email) return false;
  return env.ADMIN_ALLOWED_EMAILS.includes(String(email).toLowerCase());
}
