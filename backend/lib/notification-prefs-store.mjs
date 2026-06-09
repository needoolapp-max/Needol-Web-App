// PRD §12 — notification_preferences IO.
import { selectMany, selectOne, upsertRow } from "./supabase.mjs";
import { validatePrefPatch } from "./notification-prefs.mjs";

export async function listPreferences(userId) {
  return selectMany(
    "notification_preferences",
    `user_id=eq.${encodeURIComponent(userId)}&select=*`,
  );
}

export async function getPreference({ userId, eventType }) {
  return selectOne(
    "notification_preferences",
    `user_id=eq.${encodeURIComponent(userId)}&event_type=eq.${encodeURIComponent(eventType)}&select=*`,
  );
}

export async function setPreference({ userId, patch }) {
  const shaped = validatePrefPatch(patch);
  const row = await upsertRow(
    "notification_preferences",
    {
      user_id: userId,
      event_type: shaped.event_type,
      enabled: shaped.enabled,
      updated_at: new Date().toISOString(),
    },
    "user_id,event_type",
    { returning: "representation" },
  );
  return row;
}
