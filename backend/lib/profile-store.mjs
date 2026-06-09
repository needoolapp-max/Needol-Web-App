// PRD §3.1 + §2.6 — profile IO + side-table CRUD.
import { insertRow, selectMany, selectOne, updateRows } from "./supabase.mjs";
import {
  computeProfileComplete,
  isSkillRemovable,
  LINK_LABEL_MAX,
  linkCap,
  ProfileError,
  pickProfilePatch,
  SKILL_KINDS,
  SKILL_LABEL_MAX,
  skillCap,
} from "./profile.mjs";
import { findUserById } from "./users.mjs";

// PRD §3.1 + §8.4 — recompute profile_complete on every profile / side-table
// write. Pure: it reads the freshest user row + side-table counts and writes
// the boolean back to public.users. Returns the freshly-read user row.
export async function recomputeProfileComplete(userId) {
  const user = await findUserById(userId);
  if (!user) return null;
  const skills = await selectMany(
    "user_skills",
    `user_id=eq.${encodeURIComponent(userId)}&select=id&limit=1`,
  );
  const status = computeProfileComplete({
    user,
    skillCount: skills.length,
    hasCv: Boolean(user.cv_path),
  });
  if (Boolean(user.profile_complete) === status.complete) return user;
  await updateRows(
    "users",
    `id=eq.${encodeURIComponent(userId)}`,
    { profile_complete: status.complete },
  );
  return findUserById(userId);
}

// PRD §3.1 — full profile update, respects every §2.6 frequency / immutable
// rule. Returns the freshly-read user row.
export async function updateProfile({ userId, input, now = new Date() }) {
  const user = await findUserById(userId);
  if (!user) throw new ProfileError(404, "User not found.");
  const patch = pickProfilePatch({ user, input, now });
  if (Object.keys(patch).length === 0) return user;
  await updateRows("users", `id=eq.${encodeURIComponent(userId)}`, patch);
  return recomputeProfileComplete(userId);
}

export async function setProfilePicturePath({ userId, path, now = new Date() }) {
  await updateRows("users", `id=eq.${encodeURIComponent(userId)}`, {
    profile_picture_path: path,
    profile_picture_updated_at: now.toISOString(),
  });
  return recomputeProfileComplete(userId);
}

export async function setCvPath({ userId, path, extractedText = null, now = new Date() }) {
  await updateRows("users", `id=eq.${encodeURIComponent(userId)}`, {
    cv_path: path,
    cv_extracted_text: extractedText,
    cv_updated_at: now.toISOString(),
  });
  return recomputeProfileComplete(userId);
}

// ---- Links --------------------------------------------------------------

export async function listLinks(userId) {
  return selectMany(
    "user_links",
    `user_id=eq.${encodeURIComponent(userId)}&select=*&order=position.asc,created_at.asc`,
  );
}

export async function addLink({ userId, label, url }) {
  const user = await findUserById(userId);
  if (!user) throw new ProfileError(404, "User not found.");
  const trimmedLabel = String(label || "").trim();
  if (!trimmedLabel) throw new ProfileError(400, "Link label is required.", "label");
  if (trimmedLabel.length > LINK_LABEL_MAX) {
    throw new ProfileError(400, `Link label exceeds ${LINK_LABEL_MAX} characters.`, "label");
  }
  const trimmedUrl = String(url || "").trim();
  if (!trimmedUrl) throw new ProfileError(400, "Link URL is required.", "url");
  // Phase 8-8 — SSRF-safe URL gate. Blocks private CIDRs, metadata hosts,
  // non-http(s) schemes. Adding fetch-side OG-preview later is automatically
  // safe — an unsafe URL can never reach the storage layer.
  const { checkUrlSafety } = await import("./url-safety.mjs");
  const safety = checkUrlSafety(trimmedUrl);
  if (!safety.ok) {
    throw new ProfileError(400, `Link URL rejected (${safety.reason}).`, "url");
  }
  const existing = await listLinks(userId);
  const cap = linkCap(user.account_type);
  if (existing.length >= cap) {
    throw new ProfileError(
      400,
      `Link cap reached: ${cap} for ${user.account_type} accounts.`,
      "links",
    );
  }
  const inserted = await insertRow(
    "user_links",
    {
      user_id: userId,
      label: trimmedLabel,
      url: trimmedUrl,
      position: existing.length,
    },
    { returning: "representation" },
  );
  await recomputeProfileComplete(userId);
  return inserted;
}

export async function removeLink({ userId, linkId }) {
  const row = await selectOne(
    "user_links",
    `id=eq.${encodeURIComponent(linkId)}&user_id=eq.${encodeURIComponent(userId)}&select=*`,
  );
  if (!row) throw new ProfileError(404, "Link not found.");
  await fetchDelete(`user_links?id=eq.${encodeURIComponent(linkId)}&user_id=eq.${encodeURIComponent(userId)}`);
  await recomputeProfileComplete(userId);
  return { id: linkId };
}

// ---- Skills / products / services ---------------------------------------

export async function listSkills(userId) {
  return selectMany(
    "user_skills",
    `user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.asc`,
  );
}

export async function addSkill({ userId, kind, label, category }) {
  const user = await findUserById(userId);
  if (!user) throw new ProfileError(404, "User not found.");
  if (!SKILL_KINDS.includes(kind)) {
    throw new ProfileError(400, `kind must be one of ${SKILL_KINDS.join(", ")}.`, "kind");
  }
  const trimmedLabel = String(label || "").trim();
  if (!trimmedLabel) throw new ProfileError(400, "Label is required.", "label");
  if (trimmedLabel.length > SKILL_LABEL_MAX) {
    throw new ProfileError(400, `Label exceeds ${SKILL_LABEL_MAX} characters.`, "label");
  }
  const existing = await listSkills(userId);
  const cap = skillCap(user.account_type);
  if (existing.length >= cap) {
    throw new ProfileError(
      400,
      `Skill/product/service cap reached: ${cap} for ${user.account_type} accounts.`,
      "skills",
    );
  }
  const inserted = await insertRow(
    "user_skills",
    {
      user_id: userId,
      kind,
      label: trimmedLabel,
      category: category ? String(category).trim().slice(0, 50) : null,
    },
    { returning: "representation" },
  );
  await recomputeProfileComplete(userId);
  return inserted;
}

export async function removeSkill({ userId, skillId, now = new Date() }) {
  const row = await selectOne(
    "user_skills",
    `id=eq.${encodeURIComponent(skillId)}&user_id=eq.${encodeURIComponent(userId)}&select=*`,
  );
  if (!row) throw new ProfileError(404, "Skill not found.");
  if (!isSkillRemovable(row.created_at, now)) {
    throw new ProfileError(
      400,
      "Skill is within the 365-day removal lock and cannot be removed yet.",
      "skill",
    );
  }
  await fetchDelete(`user_skills?id=eq.${encodeURIComponent(skillId)}&user_id=eq.${encodeURIComponent(userId)}`);
  await recomputeProfileComplete(userId);
  return { id: skillId };
}

// ---- Internal helpers ---------------------------------------------------

async function fetchDelete(path) {
  const { env } = await import("./env.mjs");
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    method: "DELETE",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      prefer: "return=minimal",
    },
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Supabase DELETE ${path} failed: ${r.status} ${text}`);
  }
}
