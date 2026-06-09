// PRD §12 — notification preferences pure-logic coverage.
import assert from "node:assert/strict";
import test from "node:test";
import {
  MANDATORY_EVENT_TYPES,
  NotificationPrefError,
  isMandatory,
  shouldEmit,
  validatePrefPatch,
} from "../lib/notification-prefs.mjs";

test("mandatory set covers safety-critical events", () => {
  // Money-relevant + auth-relevant + hire-relevant events are mandatory so a
  // user can't silently miss them by toggling off.
  for (const required of [
    "subscription_expired",
    "withdrawal_completed",
    "withdrawal_failed",
    "hired",
    "post_rejected",
    "review_received",
  ]) {
    assert.equal(MANDATORY_EVENT_TYPES.has(required), true, `${required} missing from mandatory set`);
  }
});

test("isMandatory mirrors the set", () => {
  assert.equal(isMandatory("subscription_expired"), true);
  assert.equal(isMandatory("like_received"), false);
});

test("shouldEmit — default opt-in when no pref row", () => {
  assert.equal(shouldEmit({ eventType: "like_received", prefRow: null }), true);
});

test("shouldEmit — pref enabled=true emits", () => {
  assert.equal(shouldEmit({ eventType: "like_received", prefRow: { enabled: true } }), true);
});

test("shouldEmit — pref enabled=false blocks non-mandatory", () => {
  assert.equal(shouldEmit({ eventType: "like_received", prefRow: { enabled: false } }), false);
});

test("shouldEmit — mandatory events ignore opt-out", () => {
  assert.equal(shouldEmit({ eventType: "subscription_expired", prefRow: { enabled: false } }), true);
  assert.equal(shouldEmit({ eventType: "withdrawal_completed", prefRow: { enabled: false } }), true);
});

test("validatePrefPatch — missing event_type → 400", () => {
  assert.throws(
    () => validatePrefPatch({ enabled: true }),
    (e) => e instanceof NotificationPrefError && e.field === "event_type",
  );
});

test("validatePrefPatch — missing enabled → 400", () => {
  assert.throws(
    () => validatePrefPatch({ event_type: "like_received" }),
    (e) => e instanceof NotificationPrefError && e.field === "enabled",
  );
});

test("validatePrefPatch — opting out of mandatory event rejected with 400", () => {
  assert.throws(
    () => validatePrefPatch({ event_type: "subscription_expired", enabled: false }),
    (e) => e instanceof NotificationPrefError && e.field === "event_type",
  );
});

test("validatePrefPatch — opting BACK IN to a mandatory event passes (no-op)", () => {
  const out = validatePrefPatch({ event_type: "subscription_expired", enabled: true });
  assert.equal(out.event_type, "subscription_expired");
  assert.equal(out.enabled, true);
});

test("validatePrefPatch — happy path", () => {
  const out = validatePrefPatch({ event_type: "like_received", enabled: false });
  assert.deepEqual(out, { event_type: "like_received", enabled: false });
});

test("validatePrefPatch — accepts camelCase eventType key", () => {
  const out = validatePrefPatch({ eventType: "comment_received", enabled: true });
  assert.equal(out.event_type, "comment_received");
});

test("NotificationPrefError preserves status + field", () => {
  const e = new NotificationPrefError(400, "msg", "f");
  assert.equal(e.status, 400);
  assert.equal(e.field, "f");
});
