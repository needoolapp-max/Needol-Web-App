import assert from "node:assert/strict";
import test from "node:test";
import { canReviewNow, isEditable, requiresEvidence } from "../lib/reviews.mjs";
import {
  canTransition,
  pickHireRequestInput,
  quoteExpiryDate,
  validateHireRequestInput,
} from "../lib/hire-requests.mjs";
import { isUserEligible } from "../lib/job-openings.mjs";

test("review window, evidence, and edit rules hold at boundaries", () => {
  const hire = {
    reviewer_unlock_at: "2026-06-07T00:00:00Z",
    review_window_end_at: "2026-11-27T00:00:00Z",
  };
  assert.equal(canReviewNow(hire, new Date("2026-06-06T23:59:59Z")).allowed, false);
  assert.equal(canReviewNow(hire, new Date("2026-06-07T00:00:00Z")).allowed, true);
  assert.equal(canReviewNow(hire, new Date("2026-11-27T00:00:01Z")).allowed, false);
  assert.equal(requiresEvidence(1), true);
  assert.equal(requiresEvidence(2), true);
  assert.equal(requiresEvidence(3), false);
  assert.equal(isEditable({ locked_at: "2026-06-14T00:00:00Z" }, new Date("2026-06-13T23:59:59Z")), true);
});

test("hire request parsing, validation, quote expiry, and transitions work", () => {
  const input = pickHireRequestInput({
    employer_name: "  Example Ltd ",
    contact_email: " HR@EXAMPLE.COM ",
    role_title: " Engineer ",
    job_description: " Build it ",
  });
  validateHireRequestInput(input);
  assert.equal(input.contact_email, "hr@example.com");
  assert.equal(input.employment_type, "remote");
  assert.equal(quoteExpiryDate(new Date("2026-05-31T00:00:00Z")).toISOString(), "2026-06-14T00:00:00.000Z");
  assert.equal(canTransition("new", "quoted"), true);
  assert.equal(canTransition("promoted", "quoted"), false);
});

test("job opening eligibility checks active profile, account type, and location", () => {
  const opening = {
    eligible_account_type: "Individual",
    eligible_locations: ["Nigeria"],
    eligible_nationalities: [],
  };
  const eligible = {
    status: "active",
    profile_complete: true,
    account_type: "Individual",
    scope_country: "Nigeria",
  };
  assert.deepEqual(isUserEligible({ user: eligible, opening }), { ok: true });
  assert.match(isUserEligible({ user: { ...eligible, status: "inactive" }, opening }).reason, /Activate/);
  assert.match(isUserEligible({ user: { ...eligible, profile_complete: false }, opening }).reason, /Complete your profile/);
  assert.match(isUserEligible({ user: { ...eligible, account_type: "Business" }, opening }).reason, /Individual/);
  assert.match(isUserEligible({ user: { ...eligible, scope_country: "Ghana" }, opening }).reason, /location/);
});
