// PRD §9.1, §9.3, §9.4 — Trigger B "member" reviews.
// Pure logic only; IO lives in trigger-b-store.mjs and reviews-store.mjs.

export const TRIGGER_B_ELIGIBILITY_DAYS = 30;
export const TRIGGER_B_REVIEWER_ROLLING_LIMIT = 5;
export const TRIGGER_B_REVIEWER_ROLLING_WINDOW_DAYS = 30;
export const TRIGGER_B_NEW_TARGET_WINDOW_DAYS = 60;
export const TRIGGER_B_NEW_TARGET_REVIEW_CAP = 10;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export class TriggerBError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function daysBetween(later, earlier) {
  if (!later || !earlier) return Infinity;
  const a = later instanceof Date ? later : new Date(later);
  const b = earlier instanceof Date ? earlier : new Date(earlier);
  return (a.getTime() - b.getTime()) / MS_PER_DAY;
}

// Reviewer eligibility (PRD §9.3): continuously Active for ≥ 30 days.
export function isEligibleToReview({ user, now = new Date() }) {
  if (!user) return { eligible: false, reason: "User not found." };
  if (user.status !== "active") {
    return { eligible: false, reason: "Only Active accounts can leave reviews." };
  }
  if ((user.module_restrictions || []).includes("reviewing")) {
    return { eligible: false, reason: "Reviewing is restricted on this account." };
  }
  if (!user.active_since) {
    return { eligible: false, reason: "Not eligible yet: 30 continuous Active days required." };
  }
  const days = daysBetween(now, user.active_since);
  if (days < TRIGGER_B_ELIGIBILITY_DAYS) {
    return {
      eligible: false,
      reason: `Not eligible yet: ${Math.ceil(TRIGGER_B_ELIGIBILITY_DAYS - days)} days remaining.`,
      daysRemaining: Math.ceil(TRIGGER_B_ELIGIBILITY_DAYS - days),
    };
  }
  return { eligible: true };
}

// §9.4.1 — max 5 Trigger-B reviews per reviewer per rolling 30 days.
export function passesReviewerRollingLimit({ recentReviewerCount }) {
  if ((recentReviewerCount || 0) >= TRIGGER_B_REVIEWER_ROLLING_LIMIT) {
    return {
      ok: false,
      status: 429,
      reason: `Limit reached: max ${TRIGGER_B_REVIEWER_ROLLING_LIMIT} reviews per ${TRIGGER_B_REVIEWER_ROLLING_WINDOW_DAYS} days.`,
    };
  }
  return { ok: true };
}

// §9.4.2 — reviewer and target must not share the same referrer within 1 hop.
// Block iff both users have a non-null referred_by and they match.
export function passesSharedReferrerCheck({ reviewer, target }) {
  if (!reviewer || !target) return { ok: false, status: 400, reason: "Invalid users." };
  if (reviewer.id === target.id) {
    return { ok: false, status: 400, reason: "You cannot review yourself." };
  }
  if (
    reviewer.referred_by &&
    target.referred_by &&
    reviewer.referred_by === target.referred_by
  ) {
    return {
      ok: false,
      status: 403,
      reason: "You cannot review another member who shares your referrer.",
    };
  }
  if (reviewer.referred_by && reviewer.referred_by === target.referral_code) {
    return {
      ok: false,
      status: 403,
      reason: "You cannot review the member who referred you.",
    };
  }
  if (target.referred_by && target.referred_by === reviewer.referral_code) {
    return {
      ok: false,
      status: 403,
      reason: "You cannot review a member you referred.",
    };
  }
  return { ok: true };
}

// §9.4.3 — a new account (created < 60 days ago) cannot be the target of more
// than 10 Trigger-B reviews in its first 60 days.
export function passesNewTargetCap({ target, targetTriggerBCount, now = new Date() }) {
  if (!target) return { ok: false, status: 400, reason: "Invalid target." };
  const ageDays = daysBetween(now, target.created_at);
  if (ageDays < TRIGGER_B_NEW_TARGET_WINDOW_DAYS &&
      (targetTriggerBCount || 0) >= TRIGGER_B_NEW_TARGET_REVIEW_CAP) {
    return {
      ok: false,
      status: 403,
      reason: `This account has reached the ${TRIGGER_B_NEW_TARGET_REVIEW_CAP}-review cap for its first ${TRIGGER_B_NEW_TARGET_WINDOW_DAYS} days.`,
    };
  }
  return { ok: true };
}

// §9.4.4 — 1-2★ Trigger-B reviews are held for admin pre-approval.
export function shouldHold(rating) {
  return rating === 1 || rating === 2;
}

// Aggregate gate: runs every §9.4 check, returns the first failure.
export function passesAntiAbuse({
  reviewer,
  target,
  recentReviewerCount,
  targetTriggerBCount,
  now = new Date(),
}) {
  const rolling = passesReviewerRollingLimit({ recentReviewerCount });
  if (!rolling.ok) return rolling;
  const shared = passesSharedReferrerCheck({ reviewer, target });
  if (!shared.ok) return shared;
  const cap = passesNewTargetCap({ target, targetTriggerBCount, now });
  if (!cap.ok) return cap;
  return { ok: true };
}

// Reviews remain editable for 14 days, matching Trigger A behavior (PRD §9.2).
export function canEditReview(review, now = new Date()) {
  if (!review || !review.locked_at) return false;
  return now < new Date(review.locked_at);
}
