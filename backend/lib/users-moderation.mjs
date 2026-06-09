import { updateRows } from "./supabase.mjs";
import { findUserById } from "./users.mjs";

const ALLOWED_MODULES = ["posting", "commenting", "reviewing"];

export class ModerationError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function banUser(userId, { reason } = {}) {
  const user = await findUserById(userId);
  if (!user) throw new ModerationError(404, "User not found.");
  await updateRows("users", `id=eq.${encodeURIComponent(userId)}`, {
    status: "banned",
    banned_at: new Date().toISOString(),
    banned_reason: reason ?? null,
    active_since: null,
  });
  return findUserById(userId);
}

export async function unbanUser(userId) {
  const user = await findUserById(userId);
  if (!user) throw new ModerationError(404, "User not found.");
  await updateRows("users", `id=eq.${encodeURIComponent(userId)}`, {
    status: "inactive",
    banned_at: null,
    banned_reason: null,
  });
  return findUserById(userId);
}

export async function restrictUser(userId, { modules = [], reason } = {}) {
  const user = await findUserById(userId);
  if (!user) throw new ModerationError(404, "User not found.");
  const list = Array.isArray(modules) ? modules : [];
  const filtered = list.filter((m) => ALLOWED_MODULES.includes(m));
  if (filtered.length === 0) {
    throw new ModerationError(
      400,
      `Specify at least one module to restrict. Allowed: ${ALLOWED_MODULES.join(", ")}`,
    );
  }
  await updateRows("users", `id=eq.${encodeURIComponent(userId)}`, {
    status: "restricted",
    module_restrictions: filtered,
    restricted_at: new Date().toISOString(),
    restricted_reason: reason ?? null,
    active_since: null,
  });
  return findUserById(userId);
}

export async function unrestrictUser(userId) {
  const user = await findUserById(userId);
  if (!user) throw new ModerationError(404, "User not found.");
  await updateRows("users", `id=eq.${encodeURIComponent(userId)}`, {
    status: "inactive",
    module_restrictions: [],
    restricted_at: null,
    restricted_reason: null,
  });
  return findUserById(userId);
}

export { ALLOWED_MODULES };
