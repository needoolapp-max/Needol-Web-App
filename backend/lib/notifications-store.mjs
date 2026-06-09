import {
  insertRow,
  selectMany,
  selectOne,
  updateRows,
} from "./supabase.mjs";
import { findUserById } from "./users.mjs";
import { renderNotification, shouldSendEmail } from "./notifications.mjs";
import { isEmailConfigured, sendEmail } from "./email-sender.mjs";

// Primary write path. Every new notification should go through emitNotification —
// it inserts into the notifications table and optionally sends email.
// Returns the inserted row, or null if the user couldn't be found.
export async function emitNotification({ userId, eventType, payload = {} }) {
  if (!userId || !eventType) return null;
  const user = await findUserById(userId);
  if (!user) return null;

  // PRD §12 — honor per-user notification preferences. Mandatory events
  // (subscription_expired, withdrawal_*, hired, post_rejected, review_received)
  // override opt-outs. Lazy import to keep the cycle clean.
  try {
    const { getPreference } = await import("./notification-prefs-store.mjs");
    const { shouldEmit } = await import("./notification-prefs.mjs");
    const prefRow = await getPreference({ userId, eventType });
    if (!shouldEmit({ eventType, prefRow })) {
      return null;
    }
  } catch (e) {
    // Best-effort: if prefs lookup fails (e.g. table missing during partial
    // rollout), fall back to default opt-in behavior.
    console.warn(`[notifications] pref check failed: ${e.message}`);
  }

  const { title, body, channels } = renderNotification(eventType, payload);
  const row = await insertRow(
    "notifications",
    {
      user_id: userId,
      event_type: eventType,
      title,
      body,
      payload,
      channels,
    },
    { returning: "representation" },
  );

  // Email side-effect (best-effort; failure does not break the in_app insert).
  if (shouldSendEmail(channels) && isEmailConfigured() && user.email) {
    try {
      const result = await sendEmail({
        to: user.email,
        subject: title,
        text: `${title}\n\n${body || ""}\n\n— Needool`.trim(),
      });
      const patch = result.sent
        ? {
            email_sent_at: new Date().toISOString(),
            email_provider_id: result.providerId || null,
            email_error: null,
          }
        : {
            email_error: result.error || result.reason || "unknown",
          };
      await updateRows(
        "notifications",
        `id=eq.${encodeURIComponent(row.id)}`,
        patch,
      );
    } catch (err) {
      await updateRows(
        "notifications",
        `id=eq.${encodeURIComponent(row.id)}`,
        { email_error: err.message },
      );
    }
  }

  return row;
}

export async function listNotificationsForUser(userId, { limit = 50 } = {}) {
  return selectMany(
    "notifications",
    `user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc&limit=${Number(limit) || 50}`,
  );
}

export async function getNotificationById(id) {
  return selectOne("notifications", `id=eq.${encodeURIComponent(id)}&select=*`);
}

export async function markNotificationRead({ id, userId }) {
  const existing = await getNotificationById(id);
  if (!existing) return null;
  if (existing.user_id !== userId) return null;
  if (existing.read_at) return existing;
  await updateRows(
    "notifications",
    `id=eq.${encodeURIComponent(id)}`,
    { read_at: new Date().toISOString() },
  );
  return getNotificationById(id);
}

export async function markAllReadForUser(userId) {
  await updateRows(
    "notifications",
    `user_id=eq.${encodeURIComponent(userId)}&read_at=is.null`,
    { read_at: new Date().toISOString() },
  );
}

export async function unreadCountForUser(userId) {
  const rows = await selectMany(
    "notifications",
    `user_id=eq.${encodeURIComponent(userId)}&read_at=is.null&select=id&limit=1000`,
  );
  return rows.length;
}
