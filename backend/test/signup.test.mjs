// PRD §2.3, §2.4, §2.7 — signup validation pure-logic coverage.
import assert from "node:assert/strict";
import test from "node:test";
import {
  MIN_AGE_YEARS,
  SignupError,
  isAtLeastEighteen,
  pickBusinessSignup,
  pickIndividualSignup,
  resolveReferrer,
} from "../lib/signup.mjs";

const NOW = new Date("2026-06-01T00:00:00Z");

test("isAtLeastEighteen — exactly 18 today passes", () => {
  const dob = new Date(NOW);
  dob.setFullYear(NOW.getFullYear() - MIN_AGE_YEARS);
  assert.equal(isAtLeastEighteen(dob.toISOString(), NOW), true);
});

test("isAtLeastEighteen — one day under 18 fails", () => {
  const dob = new Date(NOW);
  dob.setFullYear(NOW.getFullYear() - MIN_AGE_YEARS);
  dob.setDate(dob.getDate() + 1);
  assert.equal(isAtLeastEighteen(dob.toISOString(), NOW), false);
});

test("isAtLeastEighteen — null / invalid returns false", () => {
  assert.equal(isAtLeastEighteen(null, NOW), false);
  assert.equal(isAtLeastEighteen("not-a-date", NOW), false);
  assert.equal(isAtLeastEighteen("", NOW), false);
});

test("pickIndividualSignup — required fields raise SignupError with field name", () => {
  assert.throws(
    () => pickIndividualSignup({ lastName: "Okafor", dateOfBirth: "1990-01-01" }, { now: NOW }),
    (err) => err instanceof SignupError && err.status === 400 && err.field === "first_name",
  );
});

test("pickIndividualSignup — under-18 DOB raises SignupError", () => {
  const dob = new Date(NOW);
  dob.setFullYear(NOW.getFullYear() - 17);
  assert.throws(
    () => pickIndividualSignup({
      firstName: "Test", lastName: "User", dateOfBirth: dob.toISOString(),
    }, { now: NOW }),
    (err) => err instanceof SignupError && err.field === "date_of_birth",
  );
});

test("pickIndividualSignup — happy path normalizes whitespace + enums", () => {
  const out = pickIndividualSignup({
    firstName: "  Ada  ",
    middleName: "  ",
    lastName: "Okafor",
    sex: "Female",
    nationality: "Nigerian",
    dateOfBirth: "1990-05-12",
    phone: "+234 701",
    country: "Nigeria",
    state: "Lagos",
    city: "Ikeja",
  }, { now: NOW });
  assert.equal(out.first_name, "Ada");
  assert.equal(out.middle_name, null);  // whitespace → null
  assert.equal(out.last_name, "Okafor");
  assert.equal(out.sex, "Female");
  assert.equal(out.nationality, "Nigerian");
  assert.equal(out.country, "Nigeria");
});

test("pickIndividualSignup — invalid sex enum drops to null", () => {
  const out = pickIndividualSignup({
    firstName: "A", lastName: "B", dateOfBirth: "1990-01-01", sex: "Robot",
  }, { now: NOW });
  assert.equal(out.sex, null);
});

test("pickBusinessSignup — business_address required", () => {
  assert.throws(
    () => pickBusinessSignup({}),
    (err) => err instanceof SignupError && err.field === "business_address",
  );
});

test("pickBusinessSignup — Branch without HQ details raises", () => {
  assert.throws(
    () => pickBusinessSignup({
      businessAddress: "1 Awolowo Rd, Ikoyi",
      officeType: "Branch",
    }),
    (err) => err instanceof SignupError && err.field === "hq_address",
  );
});

test("pickBusinessSignup — Branch with HQ details passes (§2.4)", () => {
  const out = pickBusinessSignup({
    businessAddress: "1 Awolowo Rd, Ikoyi",
    officeType: "Branch",
    hqAddress: "100 Marina, Lagos Island",
    hqCountry: "Nigeria",
    hqState: "Lagos",
    hqCity: "Lagos Island",
  });
  assert.equal(out.office_type, "Branch");
  assert.equal(out.hq_address, "100 Marina, Lagos Island");
  assert.equal(out.hq_country, "Nigeria");
});

test("pickBusinessSignup — HQ designation passes without HQ details", () => {
  const out = pickBusinessSignup({
    businessAddress: "1 Awolowo Rd",
    officeType: "HQ",
  });
  assert.equal(out.office_type, "HQ");
});

test("resolveReferrer — typed wins on conflict (§2.7)", () => {
  const exists = (code) => code === "TYPED" || code === "COOKIE";
  assert.equal(resolveReferrer({ typed: "TYPED", cookie: "COOKIE", exists }), "TYPED");
});

test("resolveReferrer — typed non-existent silently drops (§2.7), cookie not used", () => {
  const exists = (code) => code === "COOKIE";
  // Per §2.7: "If the typed username does not exist, attribution is silently
  // dropped". The cookie does NOT fill in — typed presence indicates explicit
  // intent.
  assert.equal(resolveReferrer({ typed: "MISSING", cookie: "COOKIE", exists }), null);
});

test("resolveReferrer — cookie used when no typed value", () => {
  const exists = (code) => code === "COOKIE";
  assert.equal(resolveReferrer({ typed: null, cookie: "COOKIE", exists }), "COOKIE");
});

test("resolveReferrer — neither set returns null", () => {
  const exists = () => false;
  assert.equal(resolveReferrer({ typed: null, cookie: null, exists }), null);
});

test("resolveReferrer — typed is case-normalized to uppercase on success", () => {
  const exists = (code) => code === "ada";
  // Caller is expected to normalize before calling exists; resolveReferrer
  // just uppercases the result for storage.
  assert.equal(resolveReferrer({ typed: "ada", cookie: null, exists: (c) => c === "ada" }), "ADA");
});

test("SignupError exposes status and field", () => {
  const e = new SignupError(400, "msg", "field_x");
  assert.equal(e.status, 400);
  assert.equal(e.field, "field_x");
});
