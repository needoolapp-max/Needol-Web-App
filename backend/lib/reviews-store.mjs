import {
  insertRow,
  selectMany,
  selectOne,
  updateRows,
} from "./supabase.mjs";
import {
  canPostReply,
  canReviewNow,
  pickReplyInput,
  replyLockedAt,
  requiresEvidence,
  ReviewError,
  validateReplyInput,
} from "./reviews.mjs";
import { emitNotification } from "./notifications-store.mjs";

async function insertReview(row) {
  return insertRow(
    "reviews",
    row,
    { returning: "representation" },
  );
}

export async function submitApplicantReview({ verifiedHire, applicantUserId, rating, comment, evidenceUrl }) {
  if (!verifiedHire) throw new ReviewError(404, "Verified hire not found.");
  if (verifiedHire.applicant_id !== applicantUserId) {
    throw new ReviewError(403, "Only the applicant can submit this review.");
  }
  const window = canReviewNow(verifiedHire);
  if (!window.allowed) throw new ReviewError(403, window.reason);
  if (requiresEvidence(rating) && !evidenceUrl) {
    throw new ReviewError(400, "Evidence link required for ratings of 1 or 2.");
  }

  return insertReview({
    trigger_type: "verified_hire",
    verified_hire_id: verifiedHire.id,
    reviewer_id: applicantUserId,
    reviewer_kind: "applicant",
    target_user_id: null,
    target_employer_name: verifiedHire.employer_name || verifiedHire.employer_email,
    rating,
    comment: comment || null,
    evidence_url: evidenceUrl || null,
    status: "live",
  });
}

export async function submitEmployerReview({ verifiedHire, rating, comment, evidenceUrl }) {
  if (!verifiedHire) throw new ReviewError(404, "Verified hire not found.");
  const window = canReviewNow(verifiedHire);
  if (!window.allowed) throw new ReviewError(403, window.reason);
  if (requiresEvidence(rating) && !evidenceUrl) {
    throw new ReviewError(400, "Evidence link required for ratings of 1 or 2.");
  }

  const row = await insertReview({
    trigger_type: "verified_hire",
    verified_hire_id: verifiedHire.id,
    reviewer_id: null,
    reviewer_kind: "employer",
    target_user_id: verifiedHire.applicant_id,
    target_employer_name: null,
    rating,
    comment: comment || null,
    evidence_url: evidenceUrl || null,
    status: "live",
  });
  if (verifiedHire.applicant_id) {
    await emitNotification({
      userId: verifiedHire.applicant_id,
      eventType: "review_received",
      payload: {
        rating,
        reviewerName: verifiedHire.employer_name || verifiedHire.employer_email || "Your employer",
        reviewerKind: "employer",
        verifiedHireId: verifiedHire.id,
      },
    });
  }
  return row;
}

export async function listReviewsForTargetUser(userId) {
  return selectMany(
    "reviews",
    `target_user_id=eq.${encodeURIComponent(userId)}&status=eq.live&select=*&order=created_at.desc`,
  );
}

export async function getReviewByVerifiedHireAndKind(verifiedHireId, kind) {
  return selectOne(
    "reviews",
    `verified_hire_id=eq.${encodeURIComponent(verifiedHireId)}&reviewer_kind=eq.${kind}&select=*`,
  );
}

export function aggregateRating(reviews) {
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return { average: 0, count: 0 };
  }
  const total = reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0);
  return { average: total / reviews.length, count: reviews.length };
}

export async function getReviewById(id) {
  return selectOne(
    "reviews",
    `id=eq.${encodeURIComponent(id)}&select=*`,
  );
}

// PRD §9.6 — submit / edit the target-user reply to a review.
export async function submitReviewReply({ reviewId, callerUserId, input }) {
  const review = await getReviewById(reviewId);
  if (!review) throw new ReviewError(404, "Review not found.");
  const gate = canPostReply({ review, callerUserId });
  if (!gate.allowed) throw new ReviewError(403, gate.reason);
  const shaped = pickReplyInput(input);
  validateReplyInput(shaped);

  const now = new Date();
  const patch = {
    reply_body: shaped.body,
    reply_evidence_url: shaped.evidenceUrl,
    reply_updated_at: now.toISOString(),
  };
  if (gate.mode === "create") {
    patch.reply_created_at = now.toISOString();
    patch.reply_locked_at = replyLockedAt(now).toISOString();
  }
  await updateRows(
    "reviews",
    `id=eq.${encodeURIComponent(reviewId)}`,
    patch,
  );
  const updated = await getReviewById(reviewId);
  // PRD §12 — notify the reviewer that the target replied. Only on first
  // creation to avoid spamming on edits.
  if (gate.mode === "create" && updated && updated.reviewer_id) {
    await emitNotification({
      userId: updated.reviewer_id,
      eventType: "review_received",
      payload: {
        replyToReviewId: reviewId,
        replyExcerpt: shaped.body.slice(0, 140),
      },
    });
  }
  return updated;
}
