export function canReviewNow(verifiedHire, now = new Date()) {
  if (!verifiedHire) return { allowed: false, reason: "Verified hire not found." };
  const unlock = new Date(verifiedHire.reviewer_unlock_at);
  const end = new Date(verifiedHire.review_window_end_at);
  if (now < unlock) return { allowed: false, reason: "Review window not yet open." };
  if (now > end) return { allowed: false, reason: "Review window has closed." };
  return { allowed: true };
}

export function requiresEvidence(rating) {
  return rating === 1 || rating === 2;
}

export function isEditable(review, now = new Date()) {
  if (!review || !review.locked_at) return false;
  return now < new Date(review.locked_at);
}

// PRD §9.6 — the target of a review can post one public reply per review,
// ≤1000 chars, optional evidence URL, editable 14 days then locked (parallel
// to the review itself).
export const REPLY_MAX_LENGTH = 1000;
export const REPLY_EDIT_WINDOW_DAYS = 14;

export function pickReplyInput(input = {}) {
  const body = String(input.body ?? "").trim();
  const evidenceUrl = String(input.evidence_url ?? input.evidenceUrl ?? "").trim();
  return {
    body,
    evidenceUrl: evidenceUrl || null,
  };
}

export function validateReplyInput(input) {
  if (!input.body) throw new ReviewError(400, "Reply body is required.");
  if (input.body.length > REPLY_MAX_LENGTH) {
    throw new ReviewError(400, `Reply too long (max ${REPLY_MAX_LENGTH} characters).`);
  }
  if (input.evidenceUrl) {
    // Phase 8-8 — SSRF-safe gate on evidence URLs too.
    let url;
    try { url = new URL(input.evidenceUrl); }
    catch { throw new ReviewError(400, "Evidence URL must be a valid http(s) link."); }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new ReviewError(400, "Evidence URL must be an http(s) link.");
    }
    const host = url.hostname.toLowerCase();
    const blocked = [
      "localhost", "127.0.0.1", "169.254.169.254",
      "metadata.google.internal", "0.0.0.0",
    ];
    if (blocked.includes(host)) {
      throw new ReviewError(400, "Evidence URL host not allowed.");
    }
    if (/^10\./.test(host) || /^192\.168\./.test(host)
        || /^172\.(1[6-9]|2[0-9]|3[01])\./.test(host)) {
      throw new ReviewError(400, "Evidence URL host not allowed.");
    }
  }
}

export function replyLockedAt(replyCreatedAt) {
  const d = new Date(replyCreatedAt);
  d.setUTCDate(d.getUTCDate() + REPLY_EDIT_WINDOW_DAYS);
  return d;
}

export function isReplyEditable(review, now = new Date()) {
  if (!review || !review.reply_created_at) return false;
  const locked = review.reply_locked_at
    ? new Date(review.reply_locked_at)
    : replyLockedAt(review.reply_created_at);
  return now < locked;
}

export function canPostReply({ review, callerUserId, now = new Date() }) {
  if (!review) return { allowed: false, reason: "Review not found." };
  if (review.status !== "live") {
    return { allowed: false, reason: "Cannot reply to a non-live review." };
  }
  if (!callerUserId) return { allowed: false, reason: "Sign in to reply." };
  if (review.target_user_id !== callerUserId) {
    return { allowed: false, reason: "Only the reviewed user can reply." };
  }
  if (review.reply_body) {
    if (!isReplyEditable(review, now)) {
      return { allowed: false, reason: "Reply edit window has closed." };
    }
    return { allowed: true, mode: "edit" };
  }
  return { allowed: true, mode: "create" };
}

export class ReviewError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
