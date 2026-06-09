// PRD §12 — per-user notification preferences. Default behavior is
// "subscribed for every event"; we persist explicit opt-outs only.
//
// Critical safety events cannot be opted out of (subscription_expired,
// withdrawal_completed/failed, hired, post_rejected, review_received) so
// users don't silently miss money / auth / hiring movement.

export const MANDATORY_EVENT_TYPES = new Set([
  "subscription_expired",
  "withdrawal_completed",
  "withdrawal_failed",
  "hired",
  "post_rejected",
  // Trigger A/B reviews land regardless — they're audit-relevant.
  "review_received",
]);

export class NotificationPrefError extends Error {
  constructor(status, message, field) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

// Returns whether an emit should proceed given (event_type, prefRow).
// prefRow is the row from notification_preferences or null when no opt-out
// exists.
export function shouldEmit({ eventType, prefRow }) {
  if (MANDATORY_EVENT_TYPES.has(eventType)) return true;
  if (!prefRow) return true; // default opt-in
  return prefRow.enabled !== false;
}

export function isMandatory(eventType) {
  return MANDATORY_EVENT_TYPES.has(eventType);
}

// Caller-supplied patch: { event_type, enabled }. Throws on missing inputs
// or attempts to opt out of mandatory events.
export function validatePrefPatch(patch = {}) {
  const eventType = typeof patch.event_type === "string"
    ? patch.event_type.trim()
    : typeof patch.eventType === "string"
      ? patch.eventType.trim()
      : "";
  const enabled = patch.enabled === undefined
    ? null
    : Boolean(patch.enabled);
  if (!eventType) {
    throw new NotificationPrefError(400, "event_type is required.", "event_type");
  }
  if (enabled === null) {
    throw new NotificationPrefError(400, "enabled (boolean) is required.", "enabled");
  }
  if (MANDATORY_EVENT_TYPES.has(eventType) && enabled === false) {
    throw new NotificationPrefError(
      400,
      `${eventType} is a mandatory event and cannot be disabled.`,
      "event_type",
    );
  }
  return { event_type: eventType, enabled };
}
