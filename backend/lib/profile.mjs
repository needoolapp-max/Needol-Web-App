// PRD §3.1 + §2.6 — pure profile composition + frequency-limit logic.
// All IO lives in lib/profile-store.mjs.

export const BIO_MAX = { Individual: 500, Business: 1000 };
export const LINK_CAP = { Individual: 7, Business: 15 };
export const SKILL_CAP = { Individual: 30, Business: 100 };
export const LINK_LABEL_MAX = 20;
export const SKILL_LABEL_MAX = 50;
export const SKILL_KINDS = ["skill", "product", "service"];
export const SKILL_REMOVAL_LOCK_DAYS = 365;
export const FREQUENCY_LIMIT_DAYS = 30;
export const MAX_FILE_BYTES = 5 * 1024 * 1024; // PRD §3.1 — 5 MB for picture + CV.

export class ProfileError extends Error {
  constructor(status, message, field) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

// PRD §3.1 — "digits and symbols stripped to block contact leakage". Removes
// long digit runs, @, raw URLs, and a couple of common contact glyphs.
export function sanitizeBio(text) {
  if (!text) return "";
  let s = String(text);
  s = s.replace(/https?:\/\/\S+/gi, "");
  s = s.replace(/www\.\S+/gi, "");
  s = s.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "");
  // Phone-like digit runs of 7+ digits (with separators).
  s = s.replace(/\+?\d[\d().\-\s]{6,}\d/g, "");
  s = s.replace(/[ \t]{2,}/g, " ").trim();
  return s;
}

export function bioCap(accountType) {
  return BIO_MAX[accountType] ?? BIO_MAX.Individual;
}

export function linkCap(accountType) {
  return LINK_CAP[accountType] ?? LINK_CAP.Individual;
}

export function skillCap(accountType) {
  return SKILL_CAP[accountType] ?? SKILL_CAP.Individual;
}

// PRD §2.6 — phone/WhatsApp, country/state/city, GPS each editable once per
// rolling 30 days. Returns true iff the field is allowed to change right now.
export function isFrequencyAllowed(updatedAtIso, now = new Date()) {
  if (!updatedAtIso) return true;
  const prev = new Date(updatedAtIso);
  if (Number.isNaN(prev.getTime())) return true;
  const diffMs = now.getTime() - prev.getTime();
  return diffMs >= FREQUENCY_LIMIT_DAYS * 24 * 60 * 60 * 1000;
}

export function daysUntilFrequencyUnlock(updatedAtIso, now = new Date()) {
  if (!updatedAtIso) return 0;
  const prev = new Date(updatedAtIso);
  if (Number.isNaN(prev.getTime())) return 0;
  const diffDays = (now.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000);
  const remaining = FREQUENCY_LIMIT_DAYS - diffDays;
  return remaining > 0 ? Math.ceil(remaining) : 0;
}

// PRD §3.1 — Skills/products/services have a 365-day removal lock. Returns
// true iff the row may be removed right now.
export function isSkillRemovable(createdAtIso, now = new Date()) {
  if (!createdAtIso) return true;
  const created = new Date(createdAtIso);
  if (Number.isNaN(created.getTime())) return true;
  const diffMs = now.getTime() - created.getTime();
  return diffMs >= SKILL_REMOVAL_LOCK_DAYS * 24 * 60 * 60 * 1000;
}

// PRD §3.1 — "must be Active to edit profile picture / bio". Other text
// fields (phone, location, links, skills, rates) are editable from Inactive
// per §2.6 (no Active gating in that section).
export function requiresActive(field) {
  return field === "profile_picture" || field === "bio";
}

// PRD §3.1 + §8.4 — deterministic profile completeness check. Used both for
// gating Job Opening applications and for the dashboard "complete your
// profile" prompt. Returns { complete: bool, missing: string[] }.
// Required fields:
//   • bio (non-empty)
//   • country + state + city (any one of state/city OK for some scopes —
//     but PRD §2.3 lists "country, state, city of residence" all required)
//   • phone (PRD §2.3)
//   • At least one skill/product/service
//   • CV/profile PDF uploaded (cv_path non-empty) — §8.4 explicitly requires
//     CV for job apply
//   • hourly_rate non-null (§3.1)
//   • work_hours non-empty (§3.1)
// Pure: takes the user row + the count of skills + cv presence flag.
export function computeProfileComplete({ user, skillCount = 0, hasCv = false }) {
  if (!user) return { complete: false, missing: ["user"] };
  const missing = [];
  if (!user.bio || !String(user.bio).trim()) missing.push("bio");
  if (!user.country) missing.push("country");
  if (!user.state) missing.push("state");
  if (!user.city) missing.push("city");
  if (!user.phone) missing.push("phone");
  if (!user.hourly_rate && user.hourly_rate !== 0) missing.push("hourly_rate");
  if (!user.work_hours || !String(user.work_hours).trim()) missing.push("work_hours");
  if (skillCount <= 0) missing.push("skills");
  if (!hasCv) missing.push("cv");
  return { complete: missing.length === 0, missing };
}

// Pulls a sanitized patch from a free-form update body. Caller has already
// loaded the current user row so we can compare timestamps.
// Throws ProfileError on the first frequency / immutable violation.
export function pickProfilePatch({ user, input, now = new Date() }) {
  if (!user) throw new ProfileError(404, "User not found.");
  const patch = {};
  const cap = bioCap(user.account_type);

  // PRD §2.6 immutable set — anyone who tries to change these gets 400.
  const FORBIDDEN = ["first_name", "middle_name", "last_name", "name",
    "username", "email", "date_of_birth"];
  for (const f of FORBIDDEN) {
    if (Object.hasOwn(input, f) && input[f] !== undefined && input[f] !== null
        && input[f] !== user[f]) {
      throw new ProfileError(400, `${f} is immutable after signup.`, f);
    }
  }

  if (typeof input.bio === "string") {
    if (user.status !== "active") {
      throw new ProfileError(403, "Bio is editable only on Active accounts.", "bio");
    }
    const cleaned = sanitizeBio(input.bio);
    if (cleaned.length > cap) {
      throw new ProfileError(
        400,
        `Bio exceeds ${cap} characters for ${user.account_type} accounts.`,
        "bio",
      );
    }
    patch.bio = cleaned;
  }

  if (input.remote !== undefined) patch.remote = Boolean(input.remote);
  if (input.hourly_rate !== undefined || input.hourlyRate !== undefined) {
    const v = Number(input.hourly_rate ?? input.hourlyRate);
    if (Number.isFinite(v) && v >= 0) patch.hourly_rate = v;
  }
  if (typeof input.currency === "string") patch.currency = input.currency.toUpperCase().slice(0, 6);
  if (typeof input.work_hours === "string" || typeof input.workHours === "string") {
    patch.work_hours = String(input.work_hours ?? input.workHours).slice(0, 200);
  }

  // Phone / WhatsApp — once per 30 days each.
  if (typeof input.phone === "string" && input.phone !== user.phone) {
    if (!isFrequencyAllowed(user.phone_updated_at, now)) {
      throw new ProfileError(
        429,
        `Phone may be changed once every ${FREQUENCY_LIMIT_DAYS} days. Try again in ${daysUntilFrequencyUnlock(user.phone_updated_at, now)} days.`,
        "phone",
      );
    }
    patch.phone = input.phone.trim();
    patch.phone_updated_at = now.toISOString();
  }
  if (typeof input.whatsapp === "string" && input.whatsapp !== user.whatsapp) {
    if (!isFrequencyAllowed(user.whatsapp_updated_at, now)) {
      throw new ProfileError(
        429,
        `WhatsApp may be changed once every ${FREQUENCY_LIMIT_DAYS} days. Try again in ${daysUntilFrequencyUnlock(user.whatsapp_updated_at, now)} days.`,
        "whatsapp",
      );
    }
    patch.whatsapp = input.whatsapp.trim();
    patch.whatsapp_updated_at = now.toISOString();
  }

  // Country / state / city — group share one timer per §2.6.
  const locationChange = ["country", "state", "city"].some((f) =>
    typeof input[f] === "string" && input[f] !== user[f]);
  if (locationChange) {
    if (!isFrequencyAllowed(user.location_updated_at, now)) {
      throw new ProfileError(
        429,
        `Location may be changed once every ${FREQUENCY_LIMIT_DAYS} days. Try again in ${daysUntilFrequencyUnlock(user.location_updated_at, now)} days.`,
        "location",
      );
    }
    if (typeof input.country === "string") patch.country = input.country.trim();
    if (typeof input.state === "string") patch.state = input.state.trim();
    if (typeof input.city === "string") patch.city = input.city.trim();
    patch.location_updated_at = now.toISOString();
  }

  // Primary GPS — once per 30 days.
  const gpsChange = (input.location_lat !== undefined && input.location_lat !== user.location_lat)
    || (input.location_lng !== undefined && input.location_lng !== user.location_lng);
  if (gpsChange) {
    if (!isFrequencyAllowed(user.gps_updated_at, now)) {
      throw new ProfileError(
        429,
        `GPS coordinates may be changed once every ${FREQUENCY_LIMIT_DAYS} days. Try again in ${daysUntilFrequencyUnlock(user.gps_updated_at, now)} days.`,
        "location_lat",
      );
    }
    const lat = Number(input.location_lat);
    const lng = Number(input.location_lng);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      patch.location_lat = lat;
      patch.location_lng = lng;
      patch.gps_updated_at = now.toISOString();
    }
  }

  return patch;
}
