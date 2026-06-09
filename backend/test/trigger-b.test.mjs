// PRD §9.1, §9.3, §9.4 — Trigger B pure-logic coverage.
import assert from "node:assert/strict";
import test from "node:test";
import {
  TRIGGER_B_ELIGIBILITY_DAYS,
  TRIGGER_B_NEW_TARGET_REVIEW_CAP,
  TRIGGER_B_NEW_TARGET_WINDOW_DAYS,
  TRIGGER_B_REVIEWER_ROLLING_LIMIT,
  TriggerBError,
  canEditReview,
  daysBetween,
  isEligibleToReview,
  passesAntiAbuse,
  passesNewTargetCap,
  passesReviewerRollingLimit,
  passesSharedReferrerCheck,
  shouldHold,
} from "../lib/trigger-b.mjs";

const NOW = new Date("2026-05-31T00:00:00Z");

function mkUser(overrides = {}) {
  return {
    id: "user_x",
    status: "active",
    module_restrictions: [],
    referred_by: null,
    referral_code: "USERX",
    created_at: new Date("2024-01-01T00:00:00Z").toISOString(),
    active_since: new Date("2026-01-01T00:00:00Z").toISOString(),
    ...overrides,
  };
}

test("isEligibleToReview — active for 30+ days passes", () => {
  const r = isEligibleToReview({ user: mkUser(), now: NOW });
  assert.equal(r.eligible, true);
});

test("isEligibleToReview — null user fails closed", () => {
  const r = isEligibleToReview({ user: null, now: NOW });
  assert.equal(r.eligible, false);
});

test("isEligibleToReview — inactive status fails", () => {
  const r = isEligibleToReview({ user: mkUser({ status: "inactive" }), now: NOW });
  assert.equal(r.eligible, false);
  assert.match(r.reason, /Active accounts/);
});

test("isEligibleToReview — restricted from reviewing fails", () => {
  const r = isEligibleToReview({ user: mkUser({ module_restrictions: ["reviewing"] }), now: NOW });
  assert.equal(r.eligible, false);
  assert.match(r.reason, /Reviewing is restricted/);
});

test("isEligibleToReview — null active_since fails closed", () => {
  const r = isEligibleToReview({ user: mkUser({ active_since: null }), now: NOW });
  assert.equal(r.eligible, false);
});

test("isEligibleToReview — exactly 30 days passes", () => {
  const activeSince = new Date(NOW.getTime() - TRIGGER_B_ELIGIBILITY_DAYS * 86400_000).toISOString();
  const r = isEligibleToReview({ user: mkUser({ active_since: activeSince }), now: NOW });
  assert.equal(r.eligible, true);
});

test("isEligibleToReview — 29 days fails with days-remaining hint", () => {
  const activeSince = new Date(NOW.getTime() - 29 * 86400_000).toISOString();
  const r = isEligibleToReview({ user: mkUser({ active_since: activeSince }), now: NOW });
  assert.equal(r.eligible, false);
  assert.equal(r.daysRemaining, 1);
});

test("passesReviewerRollingLimit — under cap ok", () => {
  assert.equal(passesReviewerRollingLimit({ recentReviewerCount: 4 }).ok, true);
});

test("passesReviewerRollingLimit — at cap blocks", () => {
  const r = passesReviewerRollingLimit({ recentReviewerCount: TRIGGER_B_REVIEWER_ROLLING_LIMIT });
  assert.equal(r.ok, false);
  assert.equal(r.status, 429);
});

test("passesSharedReferrerCheck — self-review blocked", () => {
  const u = mkUser();
  const r = passesSharedReferrerCheck({ reviewer: u, target: u });
  assert.equal(r.ok, false);
  assert.equal(r.status, 400);
});

test("passesSharedReferrerCheck — same referrer code blocks (§9.4.2)", () => {
  const r = passesSharedReferrerCheck({
    reviewer: mkUser({ id: "a", referred_by: "SHARED" }),
    target: mkUser({ id: "b", referred_by: "SHARED" }),
  });
  assert.equal(r.ok, false);
  assert.equal(r.status, 403);
});

test("passesSharedReferrerCheck — reviewer was referred by target blocks", () => {
  const r = passesSharedReferrerCheck({
    reviewer: mkUser({ id: "a", referred_by: "TARGETCODE" }),
    target: mkUser({ id: "b", referral_code: "TARGETCODE" }),
  });
  assert.equal(r.ok, false);
  assert.match(r.reason, /referred you/);
});

test("passesSharedReferrerCheck — target was referred by reviewer blocks", () => {
  const r = passesSharedReferrerCheck({
    reviewer: mkUser({ id: "a", referral_code: "REVIEWERCODE" }),
    target: mkUser({ id: "b", referred_by: "REVIEWERCODE" }),
  });
  assert.equal(r.ok, false);
  assert.match(r.reason, /a member you referred/);
});

test("passesSharedReferrerCheck — independent users pass", () => {
  const r = passesSharedReferrerCheck({
    reviewer: mkUser({ id: "a", referred_by: "REFA" }),
    target: mkUser({ id: "b", referred_by: "REFB" }),
  });
  assert.equal(r.ok, true);
});

test("passesNewTargetCap — old target with N reviews passes", () => {
  const target = mkUser({ created_at: new Date(NOW.getTime() - 365 * 86400_000).toISOString() });
  const r = passesNewTargetCap({ target, targetTriggerBCount: 100, now: NOW });
  assert.equal(r.ok, true);
});

test("passesNewTargetCap — new target at cap blocks", () => {
  const target = mkUser({ created_at: new Date(NOW.getTime() - 10 * 86400_000).toISOString() });
  const r = passesNewTargetCap({
    target,
    targetTriggerBCount: TRIGGER_B_NEW_TARGET_REVIEW_CAP,
    now: NOW,
  });
  assert.equal(r.ok, false);
  assert.equal(r.status, 403);
});

test("passesNewTargetCap — new target one under cap passes", () => {
  const target = mkUser({ created_at: new Date(NOW.getTime() - 10 * 86400_000).toISOString() });
  const r = passesNewTargetCap({
    target,
    targetTriggerBCount: TRIGGER_B_NEW_TARGET_REVIEW_CAP - 1,
    now: NOW,
  });
  assert.equal(r.ok, true);
});

test("passesNewTargetCap — target older than 60d window passes even at cap", () => {
  const target = mkUser({
    created_at: new Date(NOW.getTime() - (TRIGGER_B_NEW_TARGET_WINDOW_DAYS + 1) * 86400_000).toISOString(),
  });
  const r = passesNewTargetCap({ target, targetTriggerBCount: 999, now: NOW });
  assert.equal(r.ok, true);
});

test("shouldHold — 1 and 2 stars held, 3+ live", () => {
  assert.equal(shouldHold(1), true);
  assert.equal(shouldHold(2), true);
  assert.equal(shouldHold(3), false);
  assert.equal(shouldHold(4), false);
  assert.equal(shouldHold(5), false);
});

test("passesAntiAbuse — short-circuits at first failing rule (rolling)", () => {
  const r = passesAntiAbuse({
    reviewer: mkUser({ id: "a" }),
    target: mkUser({ id: "b" }),
    recentReviewerCount: TRIGGER_B_REVIEWER_ROLLING_LIMIT,
    targetTriggerBCount: 0,
    now: NOW,
  });
  assert.equal(r.ok, false);
  assert.equal(r.status, 429);
});

test("passesAntiAbuse — short-circuits at shared referrer", () => {
  const r = passesAntiAbuse({
    reviewer: mkUser({ id: "a", referred_by: "SHARED" }),
    target: mkUser({ id: "b", referred_by: "SHARED" }),
    recentReviewerCount: 0,
    targetTriggerBCount: 0,
    now: NOW,
  });
  assert.equal(r.ok, false);
  assert.equal(r.status, 403);
});

test("passesAntiAbuse — clean path returns ok", () => {
  const r = passesAntiAbuse({
    reviewer: mkUser({ id: "a", referred_by: null }),
    target: mkUser({ id: "b", referred_by: null }),
    recentReviewerCount: 1,
    targetTriggerBCount: 1,
    now: NOW,
  });
  assert.equal(r.ok, true);
});

test("canEditReview — within 14 days editable", () => {
  const review = { locked_at: new Date(NOW.getTime() + 7 * 86400_000).toISOString() };
  assert.equal(canEditReview(review, NOW), true);
});

test("canEditReview — past locked_at not editable", () => {
  const review = { locked_at: new Date(NOW.getTime() - 1).toISOString() };
  assert.equal(canEditReview(review, NOW), false);
});

test("daysBetween — both null returns Infinity", () => {
  assert.equal(daysBetween(null, null), Infinity);
});

test("daysBetween — accepts ISO strings", () => {
  assert.equal(daysBetween("2026-05-31T00:00:00Z", "2026-05-01T00:00:00Z"), 30);
});

test("TriggerBError preserves status", () => {
  const e = new TriggerBError(429, "limit");
  assert.equal(e.status, 429);
  assert.equal(e.message, "limit");
});
