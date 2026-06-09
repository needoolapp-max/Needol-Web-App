// Phase 7-2 — Boundary tests for every documented cap / limit.
//
// For each cap N, we assert: (count = N - 1) → allowed; (count = N) → allowed
// or boundary, (count = N + 1) → blocked. This catches off-by-one bugs that
// happy-path tests miss.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  canCreatePostThisMonth,
  maxDescriptionLength,
  maxLinksAllowed,
  maxTitleLength,
  monthlyPostLimit,
} from "../lib/posts.mjs";
import {
  canCommentToday,
  dailyCommentLimit,
  MAX_COMMENT_LENGTH,
} from "../lib/comments.mjs";
import {
  BIO_MAX,
  LINK_CAP,
  SKILL_CAP,
  LINK_LABEL_MAX,
  SKILL_LABEL_MAX,
  bioCap,
  linkCap,
  skillCap,
  FREQUENCY_LIMIT_DAYS,
  isFrequencyAllowed,
  daysUntilFrequencyUnlock,
  isSkillRemovable,
  SKILL_REMOVAL_LOCK_DAYS,
} from "../lib/profile.mjs";
import { MAX_FORWARD_MONTHS, isWithin13MonthCap, isWithinResubWindow, addDays } from "../lib/subscriptions.mjs";
import {
  REPLY_MAX_LENGTH,
  REPLY_EDIT_WINDOW_DAYS,
  isReplyEditable,
  replyLockedAt,
} from "../lib/reviews.mjs";
import {
  TRIGGER_B_REVIEWER_ROLLING_LIMIT,
  TRIGGER_B_NEW_TARGET_REVIEW_CAP,
  passesReviewerRollingLimit,
  passesNewTargetCap,
} from "../lib/trigger-b.mjs";
import { MAX_TITLE, MAX_SLUG } from "../lib/help.mjs";

// ---------------------------------------------------------------------------
// Posts — PRD §5.3 + §6.1
// ---------------------------------------------------------------------------

test("monthlyPostLimit returns PRD-stated values per kind + accountType", () => {
  assert.equal(monthlyPostLimit("Individual", "need"), 4);
  assert.equal(monthlyPostLimit("Business", "need"), 8);
  assert.equal(monthlyPostLimit("Individual", "opportunity"), 2);
  assert.equal(monthlyPostLimit("Business", "opportunity"), 4);
  // Unknown kind → 0
  assert.equal(monthlyPostLimit("Individual", "alien"), 0);
});

test("canCreatePostThisMonth allows count = limit - 1, blocks count = limit", () => {
  // Individual / need: limit 4. count 3 → allowed; count 4 → blocked.
  assert.equal(canCreatePostThisMonth({ accountType: "Individual", kind: "need", monthlyCount: 3 }), true);
  assert.equal(canCreatePostThisMonth({ accountType: "Individual", kind: "need", monthlyCount: 4 }), false);
  assert.equal(canCreatePostThisMonth({ accountType: "Individual", kind: "need", monthlyCount: 5 }), false);
  // Business / opportunity: limit 4. count 3 → allowed; count 4 → blocked.
  assert.equal(canCreatePostThisMonth({ accountType: "Business", kind: "opportunity", monthlyCount: 3 }), true);
  assert.equal(canCreatePostThisMonth({ accountType: "Business", kind: "opportunity", monthlyCount: 4 }), false);
});

test("maxTitleLength is 80 across kinds (PRD §5.1)", () => {
  for (const kind of ["need", "opportunity", "event"]) {
    assert.equal(maxTitleLength(kind), 80);
  }
});

test("maxDescriptionLength is 1500 (PRD §5.1)", () => {
  assert.equal(maxDescriptionLength("need"), 1500);
  assert.equal(maxDescriptionLength("opportunity"), 1500);
});

test("maxLinksAllowed is 3 (PRD §5.1)", () => {
  assert.equal(maxLinksAllowed(), 3);
});

// ---------------------------------------------------------------------------
// Comments — PRD §5.3
// ---------------------------------------------------------------------------

test("dailyCommentLimit: Individual 15, Business 30 (PRD §5.3)", () => {
  assert.equal(dailyCommentLimit("Individual"), 15);
  assert.equal(dailyCommentLimit("Business"), 30);
});

test("canCommentToday allows count = limit - 1, blocks count = limit", () => {
  assert.equal(canCommentToday({ accountType: "Individual", todayCount: 14 }), true);
  assert.equal(canCommentToday({ accountType: "Individual", todayCount: 15 }), false);
  assert.equal(canCommentToday({ accountType: "Business", todayCount: 29 }), true);
  assert.equal(canCommentToday({ accountType: "Business", todayCount: 30 }), false);
});

test("MAX_COMMENT_LENGTH is 1500", () => {
  assert.equal(MAX_COMMENT_LENGTH, 1500);
});

// ---------------------------------------------------------------------------
// Profile caps — PRD §3.1
// ---------------------------------------------------------------------------

test("bioCap matches PRD: Individual 500, Business 1000", () => {
  assert.equal(bioCap("Individual"), 500);
  assert.equal(bioCap("Business"), 1000);
  assert.equal(BIO_MAX.Individual, 500);
  assert.equal(BIO_MAX.Business, 1000);
});

test("linkCap matches PRD: Individual 7, Business 15", () => {
  assert.equal(linkCap("Individual"), 7);
  assert.equal(linkCap("Business"), 15);
  assert.equal(LINK_CAP.Individual, 7);
  assert.equal(LINK_CAP.Business, 15);
});

test("skillCap matches PRD: Individual 30, Business 100", () => {
  assert.equal(skillCap("Individual"), 30);
  assert.equal(skillCap("Business"), 100);
  assert.equal(SKILL_CAP.Individual, 30);
  assert.equal(SKILL_CAP.Business, 100);
});

test("LINK_LABEL_MAX is 20 + SKILL_LABEL_MAX is 50 (PRD §3.1)", () => {
  assert.equal(LINK_LABEL_MAX, 20);
  assert.equal(SKILL_LABEL_MAX, 50);
});

// ---------------------------------------------------------------------------
// Frequency limits — PRD §2.6
// ---------------------------------------------------------------------------

test("isFrequencyAllowed: exactly 30 days ago is allowed (boundary)", () => {
  const now = new Date("2026-06-30T00:00:00Z");
  const exact = new Date("2026-05-31T00:00:00Z").toISOString(); // 30 days
  assert.equal(isFrequencyAllowed(exact, now), true);
});

test("isFrequencyAllowed: 29 days ago is blocked (boundary)", () => {
  const now = new Date("2026-06-30T00:00:00Z");
  const prev = new Date("2026-06-01T00:00:00Z").toISOString(); // 29 days
  assert.equal(isFrequencyAllowed(prev, now), false);
});

test("daysUntilFrequencyUnlock returns 0 when allowed", () => {
  const now = new Date("2026-06-30T00:00:00Z");
  const allowed = new Date("2026-05-31T00:00:00Z").toISOString();
  assert.equal(daysUntilFrequencyUnlock(allowed, now), 0);
});

test("daysUntilFrequencyUnlock ceilings the remaining days", () => {
  const now = new Date("2026-06-30T12:00:00Z");
  const prev = new Date("2026-06-29T00:00:00Z").toISOString();
  const left = daysUntilFrequencyUnlock(prev, now);
  // 30 days - 1.5 days ≈ 28.5 → ceil to 29
  assert.equal(left, 29);
});

test("FREQUENCY_LIMIT_DAYS is 30", () => {
  assert.equal(FREQUENCY_LIMIT_DAYS, 30);
});

// ---------------------------------------------------------------------------
// Skill removal lock — PRD §3.1
// ---------------------------------------------------------------------------

test("SKILL_REMOVAL_LOCK_DAYS is 365", () => {
  assert.equal(SKILL_REMOVAL_LOCK_DAYS, 365);
});

test("isSkillRemovable: 364 days ago still locked", () => {
  const now = new Date("2026-06-30T00:00:00Z");
  const locked = new Date("2025-07-01T00:00:00Z").toISOString(); // 364 days
  assert.equal(isSkillRemovable(locked, now), false);
});

test("isSkillRemovable: exactly 365 days ago is removable (boundary)", () => {
  const now = new Date("2026-06-30T00:00:00Z");
  const exact = new Date("2025-06-30T00:00:00Z").toISOString();
  assert.equal(isSkillRemovable(exact, now), true);
});

test("isSkillRemovable: null created_at allows removal (legacy rows)", () => {
  assert.equal(isSkillRemovable(null), true);
});

// ---------------------------------------------------------------------------
// Subscription expiry — PRD §10.4 + §10.5
// ---------------------------------------------------------------------------

test("MAX_FORWARD_MONTHS is 13", () => {
  assert.equal(MAX_FORWARD_MONTHS, 13);
});

test("isWithin13MonthCap: exactly 13 months from now is allowed (boundary)", () => {
  const now = new Date("2026-06-30T00:00:00Z");
  const exact = new Date("2027-07-30T00:00:00Z");
  assert.equal(isWithin13MonthCap(exact, now), true);
});

test("isWithin13MonthCap: 13 months + 1 day is blocked", () => {
  const now = new Date("2026-06-30T00:00:00Z");
  const over = new Date("2027-07-31T00:00:00Z");
  assert.equal(isWithin13MonthCap(over, now), false);
});

test("isWithinResubWindow yearly: 30 days left allowed; 31 blocked (boundary)", () => {
  const now = new Date("2026-06-30T00:00:00Z");
  const exact = addDays(now, 30);
  const over = addDays(now, 31);
  assert.equal(isWithinResubWindow(exact, "individual_yearly", now), true);
  assert.equal(isWithinResubWindow(over, "individual_yearly", now), false);
});

test("isWithinResubWindow monthly: 10 days left allowed; 11 blocked (boundary)", () => {
  const now = new Date("2026-06-30T00:00:00Z");
  const exact = addDays(now, 10);
  const over = addDays(now, 11);
  assert.equal(isWithinResubWindow(exact, "individual_monthly", now), true);
  assert.equal(isWithinResubWindow(over, "individual_monthly", now), false);
});

test("isWithinResubWindow first activation (no expiry) is always allowed", () => {
  assert.equal(isWithinResubWindow(null, "individual_yearly"), true);
  assert.equal(isWithinResubWindow(undefined, "individual_monthly"), true);
});

// ---------------------------------------------------------------------------
// Reviews + replies — PRD §9.6
// ---------------------------------------------------------------------------

test("REPLY_MAX_LENGTH is 1000 + REPLY_EDIT_WINDOW_DAYS is 14", () => {
  assert.equal(REPLY_MAX_LENGTH, 1000);
  assert.equal(REPLY_EDIT_WINDOW_DAYS, 14);
});

test("replyLockedAt is exactly created + 14 days", () => {
  const created = new Date("2026-06-01T00:00:00Z");
  const locked = replyLockedAt(created);
  const days = (locked.getTime() - created.getTime()) / (24 * 60 * 60 * 1000);
  assert.equal(days, 14);
});

test("isReplyEditable: day 13 editable, day 14 still editable (lock_at not reached), day 15 locked", () => {
  const review = {
    reply_created_at: "2026-06-01T00:00:00Z",
    reply_locked_at: "2026-06-15T00:00:00Z",
  };
  assert.equal(isReplyEditable(review, new Date("2026-06-14T23:59:59Z")), true);
  assert.equal(isReplyEditable(review, new Date("2026-06-15T00:00:00Z")), false);
  assert.equal(isReplyEditable(review, new Date("2026-06-16T00:00:00Z")), false);
});

// ---------------------------------------------------------------------------
// Trigger B — PRD §9.4
// ---------------------------------------------------------------------------

test("TRIGGER_B_REVIEWER_ROLLING_LIMIT is 5", () => {
  assert.equal(TRIGGER_B_REVIEWER_ROLLING_LIMIT, 5);
});

test("passesReviewerRollingLimit: 4 reviews allowed, 5 blocks", () => {
  assert.equal(passesReviewerRollingLimit({ recentReviewerCount: 4 }).ok, true);
  assert.equal(passesReviewerRollingLimit({ recentReviewerCount: 5 }).ok, false);
  assert.equal(passesReviewerRollingLimit({ recentReviewerCount: 6 }).ok, false);
});

test("TRIGGER_B_NEW_TARGET_REVIEW_CAP is 10", () => {
  assert.equal(TRIGGER_B_NEW_TARGET_REVIEW_CAP, 10);
});

test("passesNewTargetCap allows 9, blocks 10 for accounts under 60 days", () => {
  const now = new Date("2026-06-30T00:00:00Z");
  const target = { created_at: "2026-06-01T00:00:00Z" }; // 29 days
  assert.equal(passesNewTargetCap({ target, targetTriggerBCount: 9, now }).ok, true);
  assert.equal(passesNewTargetCap({ target, targetTriggerBCount: 10, now }).ok, false);
});

test("passesNewTargetCap is unrestricted past the 60-day window", () => {
  const now = new Date("2026-06-30T00:00:00Z");
  const target = { created_at: "2026-01-01T00:00:00Z" }; // > 60 days
  assert.equal(passesNewTargetCap({ target, targetTriggerBCount: 100, now }).ok, true);
});

// ---------------------------------------------------------------------------
// Help — PRD §14
// ---------------------------------------------------------------------------

test("MAX_TITLE is 200, MAX_SLUG is 100", () => {
  assert.equal(MAX_TITLE, 200);
  assert.equal(MAX_SLUG, 100);
});
