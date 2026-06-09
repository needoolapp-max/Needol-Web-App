// PRD §3.3, §3.4 — Notify-when-active + contact intent pure logic.
import assert from "node:assert/strict";
import test from "node:test";
import {
  CONTACT_INTENT_TYPES,
  NOTIFY_WINDOW_DAYS,
  NotifyActiveError,
  canRequestNotify,
  isRequestActive,
  pickContactIntent,
  viewerNameForContactIntent,
} from "../lib/notify-active.mjs";

const NOW = new Date("2026-06-01T00:00:00Z");

test("constants — 30-day window per PRD §3.3", () => {
  assert.equal(NOTIFY_WINDOW_DAYS, 30);
  assert.deepEqual(CONTACT_INTENT_TYPES, ["phone", "whatsapp", "link", "cv"]);
});

test("canRequestNotify — missing target returns 404", () => {
  const r = canRequestNotify({ target: null, requester: { id: "r" } });
  assert.equal(r.ok, false);
  assert.equal(r.status, 404);
});

test("canRequestNotify — missing requester returns 401", () => {
  const r = canRequestNotify({ target: { id: "t" }, requester: null });
  assert.equal(r.ok, false);
  assert.equal(r.status, 401);
});

test("canRequestNotify — self-target blocked", () => {
  const r = canRequestNotify({ target: { id: "u1", status: "inactive" }, requester: { id: "u1" } });
  assert.equal(r.ok, false);
  assert.equal(r.status, 400);
});

test("canRequestNotify — already-Active target rejected with ALREADY_ACTIVE code", () => {
  const r = canRequestNotify({ target: { id: "t", status: "active" }, requester: { id: "r" } });
  assert.equal(r.ok, false);
  assert.equal(r.code, "ALREADY_ACTIVE");
});

test("canRequestNotify — inactive target + distinct requester passes", () => {
  const r = canRequestNotify({ target: { id: "t", status: "inactive" }, requester: { id: "r" } });
  assert.equal(r.ok, true);
});

test("isRequestActive — pending + within window true", () => {
  const row = { status: "pending", expires_at: new Date(NOW.getTime() + 86_400_000).toISOString() };
  assert.equal(isRequestActive(row, NOW), true);
});

test("isRequestActive — expired window false", () => {
  const row = { status: "pending", expires_at: new Date(NOW.getTime() - 1).toISOString() };
  assert.equal(isRequestActive(row, NOW), false);
});

test("isRequestActive — non-pending status false", () => {
  const row = { status: "fulfilled", expires_at: new Date(NOW.getTime() + 86_400_000).toISOString() };
  assert.equal(isRequestActive(row, NOW), false);
});

test("isRequestActive — null row false", () => {
  assert.equal(isRequestActive(null, NOW), false);
});

test("viewerNameForContactIntent — reveals name only on Active target (PRD §3.4)", () => {
  const v = { name: "Ada", username: "ada" };
  const active = viewerNameForContactIntent({ target: { status: "active" }, viewer: v });
  const inactive = viewerNameForContactIntent({ target: { status: "inactive" }, viewer: v });
  assert.equal(active, "Ada");
  assert.equal(inactive, null);
});

test("viewerNameForContactIntent — falls back to username if no name", () => {
  const r = viewerNameForContactIntent({
    target: { status: "active" },
    viewer: { name: null, username: "ada" },
  });
  assert.equal(r, "ada");
});

test("viewerNameForContactIntent — null inputs safe", () => {
  assert.equal(viewerNameForContactIntent({ target: null, viewer: null }), null);
});

test("pickContactIntent — accepts each PRD type", () => {
  for (const t of CONTACT_INTENT_TYPES) {
    const out = pickContactIntent({ type: t });
    assert.equal(out.intent_type, t);
  }
});

test("pickContactIntent — invalid type throws NotifyActiveError(400)", () => {
  assert.throws(
    () => pickContactIntent({ type: "telegram" }),
    (e) => e instanceof NotifyActiveError && e.status === 400 && e.code === "intent_type",
  );
});

test("pickContactIntent — preserves linkUrl + caps at 500 chars", () => {
  const out = pickContactIntent({ type: "link", linkUrl: "x".repeat(800) });
  assert.equal(out.link_url.length, 500);
});

test("pickContactIntent — accepts snake_case link_url", () => {
  const out = pickContactIntent({ type: "link", link_url: "https://example.com" });
  assert.equal(out.link_url, "https://example.com");
});

test("NotifyActiveError — preserves status + code", () => {
  const e = new NotifyActiveError(429, "msg", "rate");
  assert.equal(e.status, 429);
  assert.equal(e.code, "rate");
});
