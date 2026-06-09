import assert from "node:assert/strict";
import test from "node:test";
import {
  canCreatePostThisMonth,
  monthlyPostLimit,
  stripContactInfo,
  visibleToVisitor,
  visitorPostSummary,
} from "../lib/posts.mjs";
import {
  canCommentToday,
  dailyCommentLimit,
  isCommentEditable,
  postAllowsComments,
} from "../lib/comments.mjs";

test("contact stripping removes contact details but preserves ISO dates", () => {
  assert.equal(
    stripContactInfo("QA 2026-05-31 email qa@example.com phone 08012345678"),
    "QA 2026-05-31 email [contact removed] phone [contact removed]",
  );
  assert.equal(
    stripContactInfo("Apply at https://example.com or www.example.com", { stripUrls: true }),
    "Apply at [link removed] or [link removed]",
  );
});

test("post limits match individual and business PRD limits", () => {
  assert.equal(monthlyPostLimit("Individual", "need"), 4);
  assert.equal(monthlyPostLimit("Business", "need"), 8);
  assert.equal(monthlyPostLimit("Individual", "opportunity"), 2);
  assert.equal(monthlyPostLimit("Business", "opportunity"), 4);
  assert.equal(canCreatePostThisMonth({ accountType: "Individual", kind: "need", monthlyCount: 3 }), true);
  assert.equal(canCreatePostThisMonth({ accountType: "Individual", kind: "need", monthlyCount: 4 }), false);
});

test("visitor post visibility and summary enforce public cuts", () => {
  assert.equal(visibleToVisitor("need"), "summary");
  assert.equal(visibleToVisitor("event"), "summary");
  assert.equal(visibleToVisitor("opportunity"), "none");
  const summary = visitorPostSummary({
    id: "p1",
    kind: "need",
    title: "Need",
    description: "x".repeat(180),
  });
  assert.equal(summary.description.length, 151);
  assert.equal(summary.description.endsWith("…"), true);
});

test("comments are limited per account type and only allowed on open approved needs", () => {
  assert.equal(dailyCommentLimit("Individual"), 15);
  assert.equal(dailyCommentLimit("Business"), 30);
  assert.equal(canCommentToday({ accountType: "Individual", todayCount: 14 }), true);
  assert.equal(canCommentToday({ accountType: "Individual", todayCount: 15 }), false);
  assert.equal(postAllowsComments({ kind: "need", status: "approved", closed_at: null }), true);
  assert.equal(postAllowsComments({ kind: "opportunity", status: "approved", closed_at: null }), false);
  assert.equal(postAllowsComments({ kind: "need", status: "closed", closed_at: "2026-05-31T00:00:00Z" }), false);
});

test("comment edits close after sixty minutes", () => {
  const created_at = "2026-05-31T00:00:00Z";
  assert.equal(isCommentEditable({ created_at }, new Date("2026-05-31T00:59:59Z")), true);
  assert.equal(isCommentEditable({ created_at }, new Date("2026-05-31T01:00:01Z")), false);
  assert.equal(isCommentEditable({ created_at, deleted_at: "2026-05-31T00:30:00Z" }, new Date()), false);
});
