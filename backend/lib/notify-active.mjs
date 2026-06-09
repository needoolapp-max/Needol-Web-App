// PRD §3.3 "Notify when active" pure logic. IO lives in
// notify-active-store.mjs. PRD §3.4 contact intent logic lives alongside.

export const NOTIFY_WINDOW_DAYS = 30;

export class NotifyActiveError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Caller-supplied target user must be Inactive — PRD §3.3 says the button
// only renders on Inactive profiles. Self-targets are blocked.
export function canRequestNotify({ target, requester }) {
  if (!target) return { ok: false, status: 404, reason: "User not found." };
  if (!requester) return { ok: false, status: 401, reason: "Sign in to request notifications." };
  if (target.id === requester.id) return { ok: false, status: 400, reason: "You cannot request a notification for yourself." };
  if (target.status === "active") {
    return { ok: false, status: 400, reason: "This member is already Active.", code: "ALREADY_ACTIVE" };
  }
  return { ok: true };
}

// PRD §3.3 — 30-day expiry. Returns true iff the request is still pending +
// inside the window.
export function isRequestActive(row, now = new Date()) {
  if (!row || row.status !== "pending") return false;
  const expires = new Date(row.expires_at);
  if (Number.isNaN(expires.getTime())) return false;
  return now.getTime() < expires.getTime();
}

// PRD §3.4 — only reveal viewer identity to the target if the target's
// profile is Active.
export function viewerNameForContactIntent({ target, viewer }) {
  if (!target || !viewer) return null;
  if (target.status === "active") return viewer.name || viewer.username || null;
  return null;
}

export const CONTACT_INTENT_TYPES = ["phone", "whatsapp", "link", "cv"];

export function pickContactIntent(input = {}) {
  const type = String(input.type || input.intent_type || "").toLowerCase();
  if (!CONTACT_INTENT_TYPES.includes(type)) {
    throw new NotifyActiveError(400, `Invalid intent type. Must be one of: ${CONTACT_INTENT_TYPES.join(", ")}.`, "intent_type");
  }
  return {
    intent_type: type,
    link_url: typeof input.linkUrl === "string"
      ? input.linkUrl.slice(0, 500)
      : typeof input.link_url === "string"
        ? input.link_url.slice(0, 500)
        : null,
  };
}
