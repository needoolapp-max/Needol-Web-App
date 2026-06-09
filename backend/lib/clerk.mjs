import { createClerkClient, verifyToken } from "@clerk/backend";
import { Webhook } from "svix";
import { env } from "./env.mjs";

let clerkClient = null;
function getClerk() {
  if (!env.CLERK_SECRET_KEY) {
    throw new Error("CLERK_SECRET_KEY is not configured.");
  }
  if (!clerkClient) {
    clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
  }
  return clerkClient;
}

function readBearer(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header) return null;
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

export class AuthError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function verifyClerkSession(req) {
  const token = readBearer(req);
  if (!token) throw new AuthError(401, "Missing bearer token.");
  if (!env.CLERK_SECRET_KEY) throw new AuthError(500, "CLERK_SECRET_KEY not configured.");

  let payload;
  try {
    payload = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY });
  } catch (err) {
    throw new AuthError(401, `Invalid Clerk session: ${err.message}`);
  }

  const userId = payload.sub;
  if (!userId) throw new AuthError(401, "Clerk session missing subject.");

  let email = payload.email;
  if (!email) {
    const user = await getClerk().users.getUser(userId);
    email = user.primaryEmailAddress?.emailAddress
      || user.emailAddresses?.[0]?.emailAddress
      || null;
  }
  return { userId, email, claims: payload };
}

export async function fetchClerkUser(userId) {
  return getClerk().users.getUser(userId);
}

// PRD §15.4 / OWASP webhook-replay defense — reject any inbound webhook
// whose svix-timestamp is more than 5 minutes off (past or future).
// svix's library already enforces this internally (confirmed against the
// 2026 docs: docs.svix.com/receiving/verifying-payloads/how-manual), but
// we re-check here explicitly so the protection is visible in our suite
// and won't silently disappear if a future contributor swaps the library.
export const WEBHOOK_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

export function isWebhookFresh(timestampSeconds, now = Date.now()) {
  const ts = Number(timestampSeconds);
  if (!Number.isFinite(ts) || ts <= 0) return false;
  const driftMs = Math.abs(now - ts * 1000);
  return driftMs <= WEBHOOK_TIMESTAMP_TOLERANCE_MS;
}

export function verifyClerkWebhook(rawBody, headers) {
  if (!env.CLERK_WEBHOOK_SECRET) {
    throw new Error("CLERK_WEBHOOK_SECRET is not configured.");
  }
  // Explicit timestamp window check on top of svix's built-in one.
  if (!isWebhookFresh(headers["svix-timestamp"])) {
    throw new Error("Webhook timestamp outside 5-minute tolerance window.");
  }
  const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);
  const svixHeaders = {
    "svix-id": headers["svix-id"],
    "svix-timestamp": headers["svix-timestamp"],
    "svix-signature": headers["svix-signature"],
  };
  return wh.verify(rawBody, svixHeaders);
}
