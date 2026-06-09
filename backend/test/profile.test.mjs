// PRD §3.1, §2.6 — profile composition + frequency-limit pure-logic coverage.
import assert from "node:assert/strict";
import test from "node:test";
import {
  BIO_MAX,
  FREQUENCY_LIMIT_DAYS,
  LINK_CAP,
  LINK_LABEL_MAX,
  ProfileError,
  SKILL_CAP,
  SKILL_KINDS,
  SKILL_LABEL_MAX,
  SKILL_REMOVAL_LOCK_DAYS,
  bioCap,
  daysUntilFrequencyUnlock,
  isFrequencyAllowed,
  isSkillRemovable,
  linkCap,
  pickProfilePatch,
  requiresActive,
  sanitizeBio,
  skillCap,
} from "../lib/profile.mjs";

const NOW = new Date("2026-06-01T00:00:00Z");

function mkUser(overrides = {}) {
  return {
    id: "u1",
    account_type: "Individual",
    status: "active",
    phone: null,
    whatsapp: null,
    country: null,
    state: null,
    city: null,
    location_lat: null,
    location_lng: null,
    phone_updated_at: null,
    whatsapp_updated_at: null,
    location_updated_at: null,
    gps_updated_at: null,
    ...overrides,
  };
}

// ----- Constants match PRD §3.1 + §2.6 -----------------------------------

test("constants match PRD bio/link/skill caps", () => {
  assert.deepEqual(BIO_MAX, { Individual: 500, Business: 1000 });
  assert.deepEqual(LINK_CAP, { Individual: 7, Business: 15 });
  assert.deepEqual(SKILL_CAP, { Individual: 30, Business: 100 });
  assert.equal(LINK_LABEL_MAX, 20);
  assert.equal(SKILL_LABEL_MAX, 50);
  assert.equal(SKILL_REMOVAL_LOCK_DAYS, 365);
  assert.equal(FREQUENCY_LIMIT_DAYS, 30);
  assert.deepEqual(SKILL_KINDS, ["skill", "product", "service"]);
});

test("bioCap / linkCap / skillCap differ by account type", () => {
  assert.equal(bioCap("Individual"), 500);
  assert.equal(bioCap("Business"), 1000);
  assert.equal(linkCap("Individual"), 7);
  assert.equal(linkCap("Business"), 15);
  assert.equal(skillCap("Individual"), 30);
  assert.equal(skillCap("Business"), 100);
});

test("bioCap falls back to Individual on unknown account type", () => {
  assert.equal(bioCap("Unknown"), 500);
});

// ----- sanitizeBio strips contact leakage per PRD §3.1 -------------------

test("sanitizeBio strips long digit runs (phones)", () => {
  assert.equal(sanitizeBio("Hi reach me at 08012345678 anytime"), "Hi reach me at anytime");
});

test("sanitizeBio strips emails", () => {
  assert.equal(sanitizeBio("Email me at hr@example.com"), "Email me at");
});

test("sanitizeBio strips raw URLs and www", () => {
  assert.equal(sanitizeBio("Site https://example.com OR www.other.com"), "Site OR");
});

test("sanitizeBio leaves clean text unchanged", () => {
  const clean = "React + TypeScript developer in Lagos.";
  assert.equal(sanitizeBio(clean), clean);
});

test("sanitizeBio returns empty for null/undefined", () => {
  assert.equal(sanitizeBio(null), "");
  assert.equal(sanitizeBio(undefined), "");
});

// ----- Frequency limits (PRD §2.6) ---------------------------------------

test("isFrequencyAllowed — null timestamp always passes (never set)", () => {
  assert.equal(isFrequencyAllowed(null, NOW), true);
});

test("isFrequencyAllowed — exactly 30 days ago passes", () => {
  const prev = new Date(NOW.getTime() - FREQUENCY_LIMIT_DAYS * 86_400_000).toISOString();
  assert.equal(isFrequencyAllowed(prev, NOW), true);
});

test("isFrequencyAllowed — 29 days ago fails", () => {
  const prev = new Date(NOW.getTime() - 29 * 86_400_000).toISOString();
  assert.equal(isFrequencyAllowed(prev, NOW), false);
});

test("daysUntilFrequencyUnlock — returns ceil of remaining days", () => {
  const prev = new Date(NOW.getTime() - 10 * 86_400_000).toISOString();
  assert.equal(daysUntilFrequencyUnlock(prev, NOW), 20);
});

test("daysUntilFrequencyUnlock — 0 when stamp is null or past window", () => {
  assert.equal(daysUntilFrequencyUnlock(null, NOW), 0);
  const farPast = new Date(NOW.getTime() - 365 * 86_400_000).toISOString();
  assert.equal(daysUntilFrequencyUnlock(farPast, NOW), 0);
});

// ----- 365-day skill removal lock ---------------------------------------

test("isSkillRemovable — under 365 days locked", () => {
  const recent = new Date(NOW.getTime() - 100 * 86_400_000).toISOString();
  assert.equal(isSkillRemovable(recent, NOW), false);
});

test("isSkillRemovable — exactly 365 days passes", () => {
  const prev = new Date(NOW.getTime() - SKILL_REMOVAL_LOCK_DAYS * 86_400_000).toISOString();
  assert.equal(isSkillRemovable(prev, NOW), true);
});

test("isSkillRemovable — null created_at allows removal", () => {
  assert.equal(isSkillRemovable(null, NOW), true);
});

// ----- requiresActive gate ------------------------------------------------

test("requiresActive — picture and bio require Active per §2.6", () => {
  assert.equal(requiresActive("profile_picture"), true);
  assert.equal(requiresActive("bio"), true);
  assert.equal(requiresActive("phone"), false);
  assert.equal(requiresActive("hourly_rate"), false);
});

// ----- pickProfilePatch — the core integration --------------------------

test("pickProfilePatch — bio over cap throws ProfileError(400, 'bio')", () => {
  const user = mkUser({ status: "active", account_type: "Individual" });
  assert.throws(
    () => pickProfilePatch({ user, input: { bio: "x".repeat(600) } }),
    (e) => e instanceof ProfileError && e.status === 400 && e.field === "bio",
  );
});

test("pickProfilePatch — bio change on Inactive throws 403", () => {
  const user = mkUser({ status: "inactive" });
  assert.throws(
    () => pickProfilePatch({ user, input: { bio: "hello" } }),
    (e) => e instanceof ProfileError && e.status === 403,
  );
});

test("pickProfilePatch — bio happy path goes through sanitizer", () => {
  const user = mkUser({ status: "active" });
  const patch = pickProfilePatch({ user, input: { bio: "Email hr@example.com" } });
  assert.equal(patch.bio.includes("@"), false);
});

test("pickProfilePatch — immutable name change rejected", () => {
  const user = mkUser({ first_name: "Original" });
  assert.throws(
    () => pickProfilePatch({ user, input: { first_name: "Changed" } }),
    (e) => e instanceof ProfileError && e.field === "first_name",
  );
});

test("pickProfilePatch — username/email/dob immutable per §2.6", () => {
  const user = mkUser({ username: "foo", email: "a@b.com", date_of_birth: "1990-01-01" });
  for (const field of ["username", "email", "date_of_birth"]) {
    assert.throws(
      () => pickProfilePatch({ user, input: { [field]: "different" } }),
      (e) => e instanceof ProfileError && e.field === field,
    );
  }
});

test("pickProfilePatch — phone change within 30d throws 429", () => {
  const user = mkUser({
    phone: "+234 1",
    phone_updated_at: new Date(NOW.getTime() - 10 * 86_400_000).toISOString(),
  });
  assert.throws(
    () => pickProfilePatch({ user, input: { phone: "+234 2" }, now: NOW }),
    (e) => e instanceof ProfileError && e.status === 429 && e.field === "phone",
  );
});

test("pickProfilePatch — phone change after 30d sets phone_updated_at", () => {
  const user = mkUser({
    phone: "+234 1",
    phone_updated_at: new Date(NOW.getTime() - 31 * 86_400_000).toISOString(),
  });
  const patch = pickProfilePatch({ user, input: { phone: "+234 999" }, now: NOW });
  assert.equal(patch.phone, "+234 999");
  assert.equal(patch.phone_updated_at, NOW.toISOString());
});

test("pickProfilePatch — country/state/city share one timer", () => {
  // Changing only state when location_updated_at is recent → 429.
  const user = mkUser({
    country: "Nigeria",
    state: "Lagos",
    city: "Ikeja",
    location_updated_at: new Date(NOW.getTime() - 5 * 86_400_000).toISOString(),
  });
  assert.throws(
    () => pickProfilePatch({ user, input: { state: "Oyo" }, now: NOW }),
    (e) => e instanceof ProfileError && e.field === "location",
  );
});

test("pickProfilePatch — passing same values does not trigger frequency check", () => {
  const user = mkUser({
    phone: "+234 1",
    phone_updated_at: new Date(NOW.getTime() - 5 * 86_400_000).toISOString(),
  });
  // Input phone equals current phone — no change, no frequency check.
  const patch = pickProfilePatch({ user, input: { phone: "+234 1" }, now: NOW });
  assert.equal(patch.phone, undefined);
});

test("pickProfilePatch — GPS change uses gps_updated_at gate", () => {
  const user = mkUser({
    location_lat: 6.45,
    location_lng: 3.39,
    gps_updated_at: new Date(NOW.getTime() - 10 * 86_400_000).toISOString(),
  });
  assert.throws(
    () => pickProfilePatch({ user, input: { location_lat: 6.5, location_lng: 3.39 }, now: NOW }),
    (e) => e instanceof ProfileError && e.field === "location_lat",
  );
});

test("pickProfilePatch — GPS happy path bounds-checks", () => {
  const user = mkUser({ gps_updated_at: null });
  // Out-of-range coords are silently dropped (not stored).
  const patch = pickProfilePatch({ user, input: { location_lat: 99, location_lng: 0 }, now: NOW });
  assert.equal(patch.location_lat, undefined);
});

test("pickProfilePatch — happy path with multiple non-gated fields", () => {
  const user = mkUser({ status: "active" });
  const patch = pickProfilePatch({
    user,
    input: { remote: true, hourly_rate: 45, work_hours: "Mon-Fri 09:00-17:00 GMT" },
    now: NOW,
  });
  assert.equal(patch.remote, true);
  assert.equal(patch.hourly_rate, 45);
  assert.equal(patch.work_hours, "Mon-Fri 09:00-17:00 GMT");
});

test("ProfileError preserves status + field", () => {
  const e = new ProfileError(429, "msg", "phone");
  assert.equal(e.status, 429);
  assert.equal(e.field, "phone");
});
