import { selectMany, selectOne, upsertRow } from "./supabase.mjs";
import { env } from "./env.mjs";
import { pickPushSubscription, PushSubError } from "./push-subscriptions.mjs";

export async function listPushSubscriptionsForUser(userId) {
  return selectMany(
    "push_subscriptions",
    `user_id=eq.${encodeURIComponent(userId)}&select=id,endpoint,user_agent,last_seen_at,created_at&order=last_seen_at.desc`,
  );
}

export async function upsertPushSubscription({ userId, input }) {
  const shaped = pickPushSubscription(input);
  const row = await upsertRow(
    "push_subscriptions",
    {
      user_id: userId,
      endpoint: shaped.endpoint,
      p256dh: shaped.p256dh,
      auth: shaped.auth,
      user_agent: shaped.user_agent,
      last_seen_at: new Date().toISOString(),
    },
    "user_id,endpoint",
    { returning: "representation" },
  );
  return row;
}

export async function deletePushSubscription({ userId, endpoint }) {
  if (!endpoint) throw new PushSubError(400, "endpoint is required.", "endpoint");
  const existing = await selectOne(
    "push_subscriptions",
    `user_id=eq.${encodeURIComponent(userId)}&endpoint=eq.${encodeURIComponent(endpoint)}&select=id`,
  );
  if (!existing) return { deleted: false };
  const r = await fetch(
    `${env.SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${encodeURIComponent(existing.id)}`,
    {
      method: "DELETE",
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        prefer: "return=minimal",
      },
    },
  );
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Supabase DELETE push_subscriptions failed: ${r.status} ${text}`);
  }
  return { deleted: true };
}
