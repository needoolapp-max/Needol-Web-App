// PRD §3.1 + §8.4 — profile_complete pure logic.

import { test } from "node:test";
import assert from "node:assert/strict";

import { computeProfileComplete } from "../lib/profile.mjs";

function fullUser() {
  return {
    bio: "Engineering manager based in Lagos.",
    country: "Nigeria",
    state: "Lagos",
    city: "Ikeja",
    phone: "+2348000000000",
    hourly_rate: 50,
    work_hours: "Mon-Fri 9-5 GMT",
  };
}

test("computeProfileComplete returns complete:true for a fully filled user with skills + CV", () => {
  const result = computeProfileComplete({
    user: fullUser(),
    skillCount: 3,
    hasCv: true,
  });
  assert.deepEqual(result, { complete: true, missing: [] });
});

test("missing bio surfaces in missing list", () => {
  const u = { ...fullUser(), bio: "" };
  const r = computeProfileComplete({ user: u, skillCount: 1, hasCv: true });
  assert.equal(r.complete, false);
  assert.ok(r.missing.includes("bio"));
});

test("missing CV blocks completeness", () => {
  const r = computeProfileComplete({ user: fullUser(), skillCount: 2, hasCv: false });
  assert.equal(r.complete, false);
  assert.ok(r.missing.includes("cv"));
});

test("zero skills blocks completeness", () => {
  const r = computeProfileComplete({ user: fullUser(), skillCount: 0, hasCv: true });
  assert.equal(r.complete, false);
  assert.ok(r.missing.includes("skills"));
});

test("hourly_rate of exactly 0 is allowed (volunteers / free)", () => {
  const u = { ...fullUser(), hourly_rate: 0 };
  const r = computeProfileComplete({ user: u, skillCount: 1, hasCv: true });
  assert.equal(r.complete, true);
});

test("missing country/state/city all flagged", () => {
  const u = { ...fullUser(), country: null, state: null, city: null };
  const r = computeProfileComplete({ user: u, skillCount: 1, hasCv: true });
  assert.equal(r.complete, false);
  assert.ok(r.missing.includes("country"));
  assert.ok(r.missing.includes("state"));
  assert.ok(r.missing.includes("city"));
});

test("null user returns complete:false with missing user", () => {
  const r = computeProfileComplete({ user: null, skillCount: 0, hasCv: false });
  assert.deepEqual(r, { complete: false, missing: ["user"] });
});
