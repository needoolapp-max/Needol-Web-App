// Pure helpers for PRD §2.3, §2.4, §2.7 signup-time validation.
// IO lives in lib/users.mjs (upsertUserFromClerk + findUserByReferralCode).

export const SEX_VALUES = ["Male", "Female", "Other"];
export const ACCOUNT_TYPES = ["Individual", "Business"];
export const OFFICE_TYPES = ["HQ", "Branch"];
export const MIN_AGE_YEARS = 18;

export class SignupError extends Error {
  constructor(status, message, field) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

// PRD §2.3 — DOB must be 18+. Compares calendar age in UTC so the result
// matches no matter what timezone the server is running in.
export function isAtLeastEighteen(dobIso, now = new Date()) {
  if (!dobIso) return false;
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) return false;
  const cutoff = Date.UTC(
    now.getUTCFullYear() - MIN_AGE_YEARS,
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return dob.getTime() <= cutoff;
}

// PRD §2.3 — Individual signup field set. Returns a sanitized object or
// throws SignupError on missing/invalid required fields.
export function pickIndividualSignup(input = {}, { now = new Date() } = {}) {
  const out = {
    first_name: trimOrNull(input.firstName ?? input.first_name),
    middle_name: trimOrNull(input.middleName ?? input.middle_name),
    last_name: trimOrNull(input.lastName ?? input.last_name),
    sex: pickEnum(input.sex, SEX_VALUES),
    nationality: trimOrNull(input.nationality),
    date_of_birth: trimOrNull(input.dateOfBirth ?? input.date_of_birth),
    phone: trimOrNull(input.phone),
    whatsapp: trimOrNull(input.whatsapp),
    country: trimOrNull(input.country),
    state: trimOrNull(input.state),
    city: trimOrNull(input.city),
  };
  if (!out.first_name) throw new SignupError(400, "First name is required.", "first_name");
  if (!out.last_name) throw new SignupError(400, "Last name is required.", "last_name");
  if (!out.date_of_birth) throw new SignupError(400, "Date of birth is required.", "date_of_birth");
  if (!isAtLeastEighteen(out.date_of_birth, now)) {
    throw new SignupError(400, "You must be at least 18 to sign up.", "date_of_birth");
  }
  return out;
}

// PRD §2.4 — Business signup field set.
export function pickBusinessSignup(input = {}) {
  const out = {
    business_address: trimOrNull(input.businessAddress ?? input.business_address),
    office_type: pickEnum(input.officeType ?? input.office_type, OFFICE_TYPES),
    hq_address: trimOrNull(input.hqAddress ?? input.hq_address),
    hq_country: trimOrNull(input.hqCountry ?? input.hq_country),
    hq_state: trimOrNull(input.hqState ?? input.hq_state),
    hq_city: trimOrNull(input.hqCity ?? input.hq_city),
    phone: trimOrNull(input.phone),
    whatsapp: trimOrNull(input.whatsapp),
    country: trimOrNull(input.country),
    state: trimOrNull(input.state),
    city: trimOrNull(input.city),
    nationality: trimOrNull(input.nationality),
  };
  if (!out.business_address) {
    throw new SignupError(400, "Business address is required.", "business_address");
  }
  // PRD §2.4 — "if branch, HQ full address required"
  if (out.office_type === "Branch") {
    if (!out.hq_address || !out.hq_country) {
      throw new SignupError(
        400,
        "Branch offices must list the HQ full address (address + country).",
        "hq_address",
      );
    }
  }
  return out;
}

// PRD §2.7 — typed username wins on conflict, silent-drop on non-existent.
// Caller passes already-uppercased candidate codes; this returns the chosen
// referral_code (or null).
export function resolveReferrer({ typed, cookie, exists }) {
  // exists: (code: string|null) => bool — typically wraps findUserByReferralCode.
  if (typed && exists(typed)) return String(typed).toUpperCase();
  if (typed && !exists(typed)) return null; // silent-drop per §2.7
  if (cookie && exists(cookie)) return String(cookie).toUpperCase();
  return null;
}

function trimOrNull(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function pickEnum(v, allowed) {
  if (v == null) return null;
  const s = String(v).trim();
  return allowed.includes(s) ? s : null;
}
