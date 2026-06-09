import { createHmac } from "node:crypto";
import { env } from "./env.mjs";

function assertConfigured() {
  if (!env.NOWPAYMENTS_API_KEY) {
    throw new Error("NOWPAYMENTS_API_KEY is not configured.");
  }
}

async function call(path, init = {}) {
  assertConfigured();
  const response = await fetch(`${env.NOWPAYMENTS_BASE_URL}${path}`, {
    ...init,
    headers: {
      "x-api-key": env.NOWPAYMENTS_API_KEY,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  const body = text ? safeParse(text) : null;
  if (!response.ok) {
    const detail = body && typeof body === "object" ? JSON.stringify(body) : text;
    throw new Error(`NOWPayments ${init.method ?? "GET"} ${path} failed: ${response.status} ${detail}`);
  }
  return body;
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function status() {
  return call("/status");
}

export async function createInvoice({ priceAmount, orderId, orderDescription }) {
  const body = {
    price_amount: priceAmount,
    price_currency: "usd",
    order_id: orderId,
    order_description: orderDescription,
    ipn_callback_url: env.NOWPAYMENTS_IPN_CALLBACK_URL || undefined,
    success_url: env.NOWPAYMENTS_SUCCESS_URL,
    cancel_url: env.NOWPAYMENTS_CANCEL_URL,
    is_fixed_rate: false,
    is_fee_paid_by_user: true,
  };
  return call("/invoice", { method: "POST", body: JSON.stringify(body) });
}

export async function getPayment(paymentId) {
  return call(`/payment/${encodeURIComponent(paymentId)}`);
}

// Sort object keys alphabetically (recursive) before stringifying for HMAC.
// NOWPayments IPN signs the JSON-stringified body with keys sorted.
function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortKeys(value[key]);
    }
    return sorted;
  }
  return value;
}

export function verifyIpnSignature(rawBody, signatureHeader) {
  if (!env.NOWPAYMENTS_IPN_SECRET) {
    throw new Error("NOWPAYMENTS_IPN_SECRET is not configured.");
  }
  if (!signatureHeader) return false;
  const parsed = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
  const sortedJson = JSON.stringify(sortKeys(parsed));
  const expected = createHmac("sha512", env.NOWPAYMENTS_IPN_SECRET)
    .update(sortedJson)
    .digest("hex");
  return expected === String(signatureHeader).trim();
}

export const TERMINAL_STATUSES = new Set(["finished", "failed", "refunded", "expired"]);
export const SUCCESS_STATUS = "finished";

// Order-id prefix dispatch ---------------------------------------------------
// Format: '<prefix>.<part1>.<part2>...<partN>.<timestamp>'
// All parts must be free of '.' separators (Clerk userIds use '_', plan codes use '_', UUIDs use '-').

export function buildOrderId(prefix, parts) {
  const safe = (parts || []).map((p) => String(p));
  return [prefix, ...safe, String(Date.now())].join(".");
}

export function parseOrderId(orderId) {
  if (!orderId) return null;
  const segments = String(orderId).split(".");
  if (segments.length < 2) return null;
  const prefix = segments[0];
  const timestamp = Number(segments[segments.length - 1]);
  if (!prefix || !Number.isFinite(timestamp)) return null;
  const parts = segments.slice(1, -1);
  return { prefix, parts, timestamp };
}

const orderHandlers = new Map();

export function registerOrderHandler(prefix, handler) {
  orderHandlers.set(prefix, handler);
}

export function resolveOrderHandler(prefix) {
  return orderHandlers.get(prefix) || null;
}
