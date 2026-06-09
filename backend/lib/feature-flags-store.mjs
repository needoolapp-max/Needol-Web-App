import { selectMany, selectOne, upsertRow } from "./supabase.mjs";

const CACHE_TTL_MS = 30 * 1000;
const cache = new Map(); // key -> { value, expiresAt }

export const TRIGGER_B_FLAG = "trigger_b_enabled";

export async function getFlag(key, { fallback = false } = {}) {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  const row = await selectOne(
    "feature_flags",
    `key=eq.${encodeURIComponent(key)}&select=*`,
  );
  const value = row ? Boolean(row.enabled) : fallback;
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

export async function listFlags() {
  return selectMany("feature_flags", "select=*&order=key.asc");
}

export async function setFlag({ key, enabled, updatedByEmail }) {
  const row = await upsertRow(
    "feature_flags",
    {
      key,
      enabled: Boolean(enabled),
      updated_at: new Date().toISOString(),
      updated_by_email: updatedByEmail || null,
    },
    "key",
    { returning: "representation" },
  );
  cache.delete(key);
  return row;
}

export function invalidateFlagCache(key) {
  if (key) cache.delete(key);
  else cache.clear();
}
