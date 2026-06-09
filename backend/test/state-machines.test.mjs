// Phase 7-4 — State-machine sweeps.
//
// For each documented state, we assert:
//   - every legal transition returns true
//   - every illegal transition returns false (no silent allow-through)
//   - no transition leaks state (idempotent on read)
//
// The goal is to catch "forgot to add this status to the deny list" bugs,
// which the happy-path tests would miss.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  HIRE_REQUEST_STATUSES,
  canTransition,
} from "../lib/hire-requests.mjs";
import {
  canReviewNow,
  canPostReply,
  isEditable,
  isReplyEditable,
} from "../lib/reviews.mjs";

// ---------------------------------------------------------------------------
// Hire request transitions — PRD §8.2
// ---------------------------------------------------------------------------

test("HIRE_REQUEST_STATUSES is the closed enum used by the FSM", () => {
  assert.deepEqual(HIRE_REQUEST_STATUSES, ["new", "quoted", "paid", "promoted", "cancelled"]);
});

test("canTransition allows the happy path: new → quoted → paid → promoted", () => {
  assert.equal(canTransition("new", "quoted"), true);
  assert.equal(canTransition("quoted", "paid"), true);
  assert.equal(canTransition("paid", "promoted"), true);
});

test("canTransition allows cancellation from new + quoted only", () => {
  assert.equal(canTransition("new", "cancelled"), true);
  assert.equal(canTransition("quoted", "cancelled"), true);
  assert.equal(canTransition("paid", "cancelled"), false);
  assert.equal(canTransition("promoted", "cancelled"), false);
});

test("canTransition rejects all backward transitions", () => {
  // No reversal allowed once committed.
  const ordered = ["new", "quoted", "paid", "promoted"];
  for (let i = 1; i < ordered.length; i++) {
    for (let j = 0; j < i; j++) {
      assert.equal(
        canTransition(ordered[i], ordered[j]),
        false,
        `${ordered[i]} → ${ordered[j]} should be rejected`,
      );
    }
  }
});

test("canTransition rejects self-loops on terminal states", () => {
  assert.equal(canTransition("promoted", "promoted"), false);
  assert.equal(canTransition("cancelled", "cancelled"), false);
  // Even non-terminal self-loops are illegal (FSM is monotonic).
  assert.equal(canTransition("new", "new"), false);
  assert.equal(canTransition("quoted", "quoted"), false);
});

test("canTransition rejects transitions involving unknown states", () => {
  for (const from of ["new", "quoted", "paid", "promoted", "cancelled"]) {
    assert.equal(canTransition(from, "alien"), false);
  }
  for (const to of ["new", "quoted", "paid", "promoted", "cancelled"]) {
    assert.equal(canTransition("alien", to), false);
  }
  assert.equal(canTransition(undefined, undefined), false);
  assert.equal(canTransition(null, "new"), false);
});

test("canTransition: every (from, to) in the cross-product matches the published table", () => {
  const allowed = new Set([
    "new->quoted",
    "new->cancelled",
    "quoted->paid",
    "quoted->cancelled",
    "paid->promoted",
  ]);
  for (const from of HIRE_REQUEST_STATUSES) {
    for (const to of HIRE_REQUEST_STATUSES) {
      const key = `${from}->${to}`;
      const expected = allowed.has(key);
      assert.equal(
        canTransition(from, to),
        expected,
        `${key} expected ${expected}`,
      );
    }
  }
});

// ---------------------------------------------------------------------------
// Review window — PRD §9.2
// ---------------------------------------------------------------------------

test("canReviewNow returns disallowed before reviewer_unlock_at", () => {
  const vh = {
    reviewer_unlock_at: "2026-07-01T00:00:00Z",
    review_window_end_at: "2026-12-28T00:00:00Z",
  };
  const r = canReviewNow(vh, new Date("2026-06-15T00:00:00Z"));
  assert.equal(r.allowed, false);
});

test("canReviewNow returns disallowed after review_window_end_at", () => {
  const vh = {
    reviewer_unlock_at: "2026-01-01T00:00:00Z",
    review_window_end_at: "2026-06-30T00:00:00Z",
  };
  const r = canReviewNow(vh, new Date("2026-12-31T00:00:00Z"));
  assert.equal(r.allowed, false);
});

test("canReviewNow returns allowed mid-window (boundary at unlock + window-end)", () => {
  const vh = {
    reviewer_unlock_at: "2026-06-01T00:00:00Z",
    review_window_end_at: "2026-12-01T00:00:00Z",
  };
  // Exactly at unlock
  assert.equal(canReviewNow(vh, new Date("2026-06-01T00:00:00Z")).allowed, true);
  // Mid-window
  assert.equal(canReviewNow(vh, new Date("2026-09-01T00:00:00Z")).allowed, true);
});

test("canReviewNow with missing verified-hire is rejected", () => {
  assert.equal(canReviewNow(null).allowed, false);
  assert.equal(canReviewNow(undefined).allowed, false);
});

// ---------------------------------------------------------------------------
// Review edit window
// ---------------------------------------------------------------------------

test("isEditable: review without locked_at is NOT editable (defensive)", () => {
  assert.equal(isEditable({ locked_at: null }), false);
  assert.equal(isEditable({}), false);
  assert.equal(isEditable(null), false);
});

test("isEditable: review with future locked_at is editable", () => {
  const future = new Date(Date.now() + 60_000).toISOString();
  assert.equal(isEditable({ locked_at: future }), true);
});

test("isEditable: review with past locked_at is NOT editable", () => {
  const past = new Date(Date.now() - 60_000).toISOString();
  assert.equal(isEditable({ locked_at: past }), false);
});

// ---------------------------------------------------------------------------
// Reply state machine — PRD §9.6
// ---------------------------------------------------------------------------

test("canPostReply: held reviews never accept replies", () => {
  const review = { id: "r1", status: "held", target_user_id: "u1" };
  assert.equal(canPostReply({ review, callerUserId: "u1" }).allowed, false);
});

test("canPostReply: rejected reviews never accept replies", () => {
  const review = { id: "r1", status: "rejected", target_user_id: "u1" };
  assert.equal(canPostReply({ review, callerUserId: "u1" }).allowed, false);
});

test("canPostReply: only the target can reply (not the reviewer, not strangers)", () => {
  const review = { id: "r1", status: "live", target_user_id: "u1", reviewer_id: "u2" };
  assert.equal(canPostReply({ review, callerUserId: "u2" }).allowed, false);
  assert.equal(canPostReply({ review, callerUserId: "stranger" }).allowed, false);
});

test("canPostReply: edit window enforced after first reply", () => {
  const r = {
    id: "r1", status: "live", target_user_id: "u1",
    reply_body: "old",
    reply_created_at: "2026-06-01T00:00:00Z",
    reply_locked_at: "2026-06-15T00:00:00Z",
  };
  // Inside window → edit allowed.
  assert.deepEqual(
    canPostReply({ review: r, callerUserId: "u1", now: new Date("2026-06-10T00:00:00Z") }),
    { allowed: true, mode: "edit" },
  );
  // Past window → blocked.
  assert.equal(
    canPostReply({ review: r, callerUserId: "u1", now: new Date("2026-06-20T00:00:00Z") }).allowed,
    false,
  );
});

test("isReplyEditable: derives lock from reply_created_at when reply_locked_at is null", () => {
  // Some legacy rows might miss reply_locked_at; the derivation should still work.
  const within = { reply_created_at: "2026-06-01T00:00:00Z", reply_locked_at: null };
  assert.equal(isReplyEditable(within, new Date("2026-06-10T00:00:00Z")), true);
  const past = { reply_created_at: "2026-05-01T00:00:00Z", reply_locked_at: null };
  assert.equal(isReplyEditable(past, new Date("2026-06-10T00:00:00Z")), false);
});
