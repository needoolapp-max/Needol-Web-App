// PRD §9.6 — review-reply pure logic.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  REPLY_MAX_LENGTH,
  ReviewError,
  canPostReply,
  isReplyEditable,
  pickReplyInput,
  replyLockedAt,
  validateReplyInput,
} from "../lib/reviews.mjs";

test("pickReplyInput trims body + null-coerces missing evidence_url", () => {
  const a = pickReplyInput({ body: "  hello  " });
  assert.equal(a.body, "hello");
  assert.equal(a.evidenceUrl, null);
  const b = pickReplyInput({ body: "hi", evidence_url: " https://example.com  " });
  assert.equal(b.evidenceUrl, "https://example.com");
});

test("validateReplyInput rejects empty body + over-length body", () => {
  assert.throws(() => validateReplyInput({ body: "", evidenceUrl: null }), (e) => e instanceof ReviewError);
  const oversized = "x".repeat(REPLY_MAX_LENGTH + 1);
  assert.throws(() => validateReplyInput({ body: oversized, evidenceUrl: null }), (e) => e instanceof ReviewError);
  validateReplyInput({ body: "ok", evidenceUrl: null });
});

test("validateReplyInput rejects non-http(s) evidence", () => {
  assert.throws(() => validateReplyInput({ body: "x", evidenceUrl: "ftp://nope" }), (e) => e instanceof ReviewError);
  assert.throws(() => validateReplyInput({ body: "x", evidenceUrl: "not a url" }), (e) => e instanceof ReviewError);
  validateReplyInput({ body: "x", evidenceUrl: "https://ok.example" });
  validateReplyInput({ body: "x", evidenceUrl: "http://ok.example" });
});

test("replyLockedAt is reply_created_at + 14 days", () => {
  const created = new Date("2026-06-01T00:00:00Z");
  const locked = replyLockedAt(created);
  const days = (locked.getTime() - created.getTime()) / (24 * 60 * 60 * 1000);
  assert.equal(days, 14);
});

test("isReplyEditable returns true within 14 days, false past lock", () => {
  const review = {
    reply_created_at: "2026-06-01T00:00:00Z",
    reply_locked_at: "2026-06-15T00:00:00Z",
  };
  assert.equal(isReplyEditable(review, new Date("2026-06-10T00:00:00Z")), true);
  assert.equal(isReplyEditable(review, new Date("2026-06-20T00:00:00Z")), false);
  assert.equal(isReplyEditable({}, new Date()), false);
});

test("canPostReply gates by target_user_id + review status + lock", () => {
  const live = { id: "r1", status: "live", target_user_id: "u1" };
  assert.deepEqual(canPostReply({ review: live, callerUserId: "u1" }), { allowed: true, mode: "create" });
  assert.equal(canPostReply({ review: live, callerUserId: "other" }).allowed, false);
  assert.equal(canPostReply({ review: live, callerUserId: null }).allowed, false);
  assert.equal(canPostReply({ review: { ...live, status: "held" }, callerUserId: "u1" }).allowed, false);

  const withReply = {
    ...live,
    reply_body: "first",
    reply_created_at: "2026-06-01T00:00:00Z",
    reply_locked_at: "2026-06-15T00:00:00Z",
  };
  const within = canPostReply({ review: withReply, callerUserId: "u1", now: new Date("2026-06-10T00:00:00Z") });
  assert.deepEqual(within, { allowed: true, mode: "edit" });
  const after = canPostReply({ review: withReply, callerUserId: "u1", now: new Date("2026-06-20T00:00:00Z") });
  assert.equal(after.allowed, false);
});
