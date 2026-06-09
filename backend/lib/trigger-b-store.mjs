import { insertRow, selectMany, selectOne, updateRows } from "./supabase.mjs";
import {
  TRIGGER_B_REVIEWER_ROLLING_WINDOW_DAYS,
  TriggerBError,
  isEligibleToReview,
  passesAntiAbuse,
  shouldHold,
} from "./trigger-b.mjs";
import { requiresEvidence } from "./reviews.mjs";
import { getFlag, TRIGGER_B_FLAG } from "./feature-flags-store.mjs";
import { findUserById } from "./users.mjs";
import { emitNotification } from "./notifications-store.mjs";

const ROLLING_MS = TRIGGER_B_REVIEWER_ROLLING_WINDOW_DAYS * 24 * 60 * 60 * 1000;

function rollingCutoffIso(now = new Date()) {
  return new Date(now.getTime() - ROLLING_MS).toISOString();
}

export async function countRecentReviewsByReviewer(reviewerId, { now = new Date() } = {}) {
  const cutoff = rollingCutoffIso(now);
  const rows = await selectMany(
    "reviews",
    `reviewer_id=eq.${encodeURIComponent(reviewerId)}` +
      `&trigger_type=eq.member` +
      `&created_at=gte.${encodeURIComponent(cutoff)}` +
      `&select=id`,
  );
  return rows.length;
}

export async function countTriggerBReviewsForTarget(targetUserId) {
  const rows = await selectMany(
    "reviews",
    `target_user_id=eq.${encodeURIComponent(targetUserId)}` +
      `&trigger_type=eq.member` +
      `&status=in.(live,held)` +
      `&select=id`,
  );
  return rows.length;
}

export async function getExistingMemberReview(reviewerId, targetUserId) {
  return selectOne(
    "reviews",
    `reviewer_id=eq.${encodeURIComponent(reviewerId)}` +
      `&target_user_id=eq.${encodeURIComponent(targetUserId)}` +
      `&trigger_type=eq.member` +
      `&select=*`,
  );
}

export async function canReviewProfile({ reviewerId, targetUserId, now = new Date() }) {
  const flag = await getFlag(TRIGGER_B_FLAG, { fallback: false });
  if (!flag) return { ok: false, status: 503, reason: "Trigger B is disabled by Owner." };
  const [reviewer, target] = await Promise.all([
    findUserById(reviewerId),
    findUserById(targetUserId),
  ]);
  if (!target) return { ok: false, status: 404, reason: "Target user not found." };
  const eligibility = isEligibleToReview({ user: reviewer, now });
  if (!eligibility.eligible) return { ok: false, status: 403, reason: eligibility.reason };

  const existing = await getExistingMemberReview(reviewerId, targetUserId);
  if (existing) return { ok: false, status: 409, reason: "You have already reviewed this member." };

  const [recentReviewerCount, targetTriggerBCount] = await Promise.all([
    countRecentReviewsByReviewer(reviewerId, { now }),
    countTriggerBReviewsForTarget(targetUserId),
  ]);
  const guard = passesAntiAbuse({
    reviewer,
    target,
    recentReviewerCount,
    targetTriggerBCount,
    now,
  });
  if (!guard.ok) return guard;
  return { ok: true, reviewer, target };
}

export async function submitTriggerBReview({
  reviewerId,
  targetUserId,
  rating,
  comment,
  evidenceUrl,
  now = new Date(),
}) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new TriggerBError(400, "rating must be an integer between 1 and 5.");
  }
  if (requiresEvidence(rating) && !evidenceUrl) {
    throw new TriggerBError(400, "Evidence link required for ratings of 1 or 2.");
  }
  const gate = await canReviewProfile({ reviewerId, targetUserId, now });
  if (!gate.ok) throw new TriggerBError(gate.status || 403, gate.reason);

  const status = shouldHold(rating) ? "held" : "live";
  const row = await insertRow(
    "reviews",
    {
      trigger_type: "member",
      reviewer_id: reviewerId,
      reviewer_kind: "member",
      target_user_id: targetUserId,
      rating,
      comment: comment || null,
      evidence_url: evidenceUrl || null,
      status,
    },
    { returning: "representation" },
  );

  // Emit notifications. Live → review_received; held → review_held.
  await emitNotification({
    userId: targetUserId,
    eventType: status === "held" ? "review_held" : "review_received",
    payload: {
      rating,
      reviewerName: gate.reviewer?.name || gate.reviewer?.username || "A member",
      reviewerKind: "member",
      reviewId: row?.id,
    },
  });
  return row;
}

export async function listHeldReviews({ limit = 100 } = {}) {
  return selectMany(
    "reviews",
    `status=eq.held&trigger_type=eq.member&select=*&order=created_at.desc&limit=${limit}`,
  );
}

export async function listReportedReviews({ limit = 100 } = {}) {
  return selectMany(
    "review_reports",
    `status=eq.open&select=*,review:reviews!review_reports_review_id_fkey(*)&order=created_at.desc&limit=${limit}`,
  );
}

export async function approveHeldReview({ reviewId }) {
  await updateRows(
    "reviews",
    `id=eq.${encodeURIComponent(reviewId)}`,
    { status: "live" },
  );
  const row = await selectOne("reviews", `id=eq.${encodeURIComponent(reviewId)}&select=*`);
  if (row && row.target_user_id) {
    await emitNotification({
      userId: row.target_user_id,
      eventType: "review_received",
      payload: {
        rating: row.rating,
        reviewerName: "A member",
        reviewerKind: "member",
        reviewId: row.id,
      },
    });
  }
  return row;
}

export async function rejectHeldReview({ reviewId, holdReason }) {
  await updateRows(
    "reviews",
    `id=eq.${encodeURIComponent(reviewId)}`,
    {
      status: "rejected",
      hold_reason: holdReason || "Rejected by admin",
    },
  );
  return selectOne("reviews", `id=eq.${encodeURIComponent(reviewId)}&select=*`);
}

export async function createReviewReport({ reviewId, reporterId, reason }) {
  const review = await selectOne("reviews", `id=eq.${encodeURIComponent(reviewId)}&select=*`);
  if (!review) throw new TriggerBError(404, "Review not found.");
  if (review.target_user_id !== reporterId) {
    throw new TriggerBError(403, "Only the target of the review can report it.");
  }
  return insertRow(
    "review_reports",
    {
      review_id: reviewId,
      reporter_id: reporterId,
      reason: reason ? String(reason).slice(0, 500) : null,
      status: "open",
    },
    { returning: "representation" },
  );
}

export async function resolveReviewReport({ reportId, adminId, action }) {
  const resolved = action === "removed" ? "resolved_removed" : "resolved_kept";
  await updateRows(
    "review_reports",
    `id=eq.${encodeURIComponent(reportId)}`,
    {
      status: resolved,
      resolved_at: new Date().toISOString(),
      admin_id: adminId || null,
    },
  );
  return selectOne(
    "review_reports",
    `id=eq.${encodeURIComponent(reportId)}&select=*`,
  );
}
