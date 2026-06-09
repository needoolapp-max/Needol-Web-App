// PRD §5.3 — comment limits per account type (resets 00:00 GMT next day).
const DAILY_COMMENT_LIMIT = {
  Individual: 15,
  Business: 30,
};

export function dailyCommentLimit(accountType) {
  return DAILY_COMMENT_LIMIT[accountType] ?? 0;
}

export function canCommentToday({ accountType, todayCount }) {
  return todayCount < dailyCommentLimit(accountType);
}

export const MAX_COMMENT_LENGTH = 1500;

// PRD §5.4 — comments are only allowed on Need Requests. Opportunities
// (§6.1) and Events (§7) reject comment attempts.
export function postAllowsComments(post) {
  if (!post) return false;
  return post.kind === "need" && post.status === "approved" && !post.closed_at;
}

// Edits stay open for 60 minutes after creation (parallel to PRD §9.2's
// 14-day review edit window, just much tighter for comments).
const EDIT_WINDOW_MS = 60 * 60 * 1000;

export function isCommentEditable(comment, now = new Date()) {
  if (!comment || comment.deleted_at) return false;
  const created = new Date(comment.created_at);
  return now.getTime() - created.getTime() <= EDIT_WINDOW_MS;
}

export class CommentError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
