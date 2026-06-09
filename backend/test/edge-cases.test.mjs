// Edge-case coverage across pure libs that the original tests skipped.
import assert from "node:assert/strict";
import test from "node:test";
import {
  isModuleRestricted,
  publicPostShape,
  stripContactInfo,
  visibleToVisitor,
  visitorPostSummary,
} from "../lib/posts.mjs";
import { CommentError, MAX_COMMENT_LENGTH, isCommentEditable } from "../lib/comments.mjs";
import {
  NOTIFICATION_EVENTS,
  getEventConfig,
  renderNotification,
  shouldSendEmail,
} from "../lib/notifications.mjs";
import {
  REMINDER_DAYS,
  classifySubscription,
  planExpiryTick,
} from "../lib/expiry.mjs";
import {
  addMonths,
  computeNextPeriod,
  getPlan,
  isWithin13MonthCap,
  PLAN_CATALOG,
} from "../lib/subscriptions.mjs";

// --- posts.mjs ----------------------------------------------------------------

test("stripContactInfo — handles null/undefined gracefully", () => {
  assert.equal(stripContactInfo(null), "");
  assert.equal(stripContactInfo(undefined), "");
  assert.equal(stripContactInfo(""), "");
});

test("stripContactInfo — leaves clean text intact", () => {
  const clean = "Looking for a React dev for a 2-week dashboard build.";
  assert.equal(stripContactInfo(clean), clean);
});

test("stripContactInfo — strips long international phone formats", () => {
  assert.match(stripContactInfo("Call +234 (701) 234-5678 today"), /\[contact removed\]/);
});

test("stripContactInfo — does not double-strip when stripUrls is true and content has both", () => {
  const out = stripContactInfo("hr@example.com and https://example.com", { stripUrls: true });
  assert.match(out, /\[contact removed\]/);
  assert.match(out, /\[link removed\]/);
});

test("isModuleRestricted — banned blocks everything", () => {
  assert.equal(isModuleRestricted({ status: "banned" }, "posting"), true);
  assert.equal(isModuleRestricted({ status: "banned" }, "reviewing"), true);
});

test("isModuleRestricted — restricted only blocks listed modules", () => {
  const u = { status: "restricted", module_restrictions: ["posting"] };
  assert.equal(isModuleRestricted(u, "posting"), true);
  assert.equal(isModuleRestricted(u, "reviewing"), false);
});

test("isModuleRestricted — null user returns false", () => {
  assert.equal(isModuleRestricted(null, "anything"), false);
});

test("isModuleRestricted — active user with no restrictions returns false", () => {
  assert.equal(isModuleRestricted({ status: "active" }, "posting"), false);
});

test("publicPostShape — canComment only true for approved need + signed-in viewer", () => {
  const post = { id: "p", kind: "need", status: "approved" };
  assert.equal(publicPostShape(post, { viewerSignedIn: true }).canComment, true);
  assert.equal(publicPostShape(post, { viewerSignedIn: false }).canComment, false);
  assert.equal(
    publicPostShape({ ...post, kind: "opportunity" }, { viewerSignedIn: true }).canComment,
    false,
  );
  assert.equal(
    publicPostShape({ ...post, status: "pending" }, { viewerSignedIn: true }).canComment,
    false,
  );
});

test("publicPostShape — null post yields null", () => {
  assert.equal(publicPostShape(null), null);
});

test("visitorPostSummary — short description not truncated", () => {
  const out = visitorPostSummary({ id: "p", kind: "need", title: "T", description: "short" });
  assert.equal(out.description, "short");
});

test("visibleToVisitor — opportunities are 'none'", () => {
  assert.equal(visibleToVisitor("opportunity"), "none");
});

// --- comments.mjs ------------------------------------------------------------

test("CommentError — exposes status and code", () => {
  const e = new CommentError(429, "too many", "DAILY_LIMIT");
  assert.equal(e.status, 429);
  assert.equal(e.code, "DAILY_LIMIT");
});

test("MAX_COMMENT_LENGTH — sane upper bound", () => {
  assert.equal(MAX_COMMENT_LENGTH, 1500);
});

test("isCommentEditable — null comment is not editable", () => {
  assert.equal(isCommentEditable(null), false);
});

// --- notifications.mjs ------------------------------------------------------

test("renderNotification — known event uses catalog template", () => {
  const r = renderNotification("subscription_activated", {
    plan: "individual_monthly",
    periodEnd: "2026-08-27",
  });
  assert.match(r.title, /Subscription active/);
  assert.match(r.body, /individual monthly/);
  assert.deepEqual(r.channels, ["in_app", "email"]);
});

test("renderNotification — unknown event uses fallback shape", () => {
  const r = renderNotification("totally_made_up_event");
  assert.equal(r.title, "totally_made_up_event");
  assert.deepEqual(r.channels, ["in_app"]);
});

test("renderNotification — review_held event is in catalog with in_app only", () => {
  const r = renderNotification("review_held", { rating: 1, reviewerName: "Bob" });
  assert.match(r.title, /Held|Pending|pre-approval/i);
  assert.deepEqual(r.channels, ["in_app"]);
});

test("renderNotification — like_received pivots on commentId", () => {
  const postLike = renderNotification("like_received", { commentId: null });
  const commentLike = renderNotification("like_received", { commentId: "c1" });
  assert.match(postLike.title, /post/i);
  assert.match(commentLike.title, /comment/i);
});

test("shouldSendEmail — only true when channels include email", () => {
  assert.equal(shouldSendEmail(["in_app", "email"]), true);
  assert.equal(shouldSendEmail(["in_app"]), false);
  assert.equal(shouldSendEmail(null), false);
});

test("NOTIFICATION_EVENTS — every event has a callable title and body", () => {
  for (const [name, cfg] of Object.entries(NOTIFICATION_EVENTS)) {
    assert.equal(typeof cfg.title, "function", `${name}.title not a function`);
    assert.equal(typeof cfg.body, "function", `${name}.body not a function`);
    assert.equal(Array.isArray(cfg.channels), true, `${name}.channels not array`);
  }
});

test("getEventConfig — unknown event returns null", () => {
  assert.equal(getEventConfig("nope"), null);
});

// --- expiry.mjs --------------------------------------------------------------

test("classifySubscription — 7 days out yields subscription_expiring at 7", () => {
  const sub = {
    id: "s1",
    user_id: "u",
    plan: "individual_yearly",
    status: "active",
    current_period_end: "2026-06-07T00:00:00Z",
  };
  const events = classifySubscription({ subscription: sub, now: new Date("2026-05-31T00:00:00Z") });
  const types = events.map((e) => e.type);
  assert.equal(types.includes("subscription_expiring"), true);
  const expiring = events.find((e) => e.type === "subscription_expiring");
  assert.equal(expiring.payload.daysLeft, 7);
});

test("classifySubscription — past current_period_end yields subscription_expired", () => {
  const sub = {
    id: "s1",
    user_id: "u",
    plan: "individual_monthly",
    status: "active",
    current_period_end: "2026-05-20T00:00:00Z",
  };
  const events = classifySubscription({ subscription: sub, now: new Date("2026-05-31T00:00:00Z") });
  assert.equal(events.some((e) => e.type === "subscription_expired"), true);
});

test("REMINDER_DAYS includes 7, 3, 1 in descending order", () => {
  assert.deepEqual(REMINDER_DAYS, [7, 3, 1]);
});

test("planExpiryTick — empty subscriptions returns zeros", () => {
  const out = planExpiryTick({ subscriptions: [], now: new Date() });
  assert.deepEqual(out.summary, { expired: 0, expiringWarned: 0, windowOpened: 0 });
  assert.deepEqual(out.work, []);
});

// --- subscriptions.mjs -------------------------------------------------------

test("addMonths — handles leap-year February", () => {
  assert.equal(addMonths(new Date("2024-01-31T00:00:00Z"), 1).toISOString(), "2024-02-29T00:00:00.000Z");
});

test("addMonths — handles month boundaries", () => {
  assert.equal(addMonths(new Date("2026-12-15T00:00:00Z"), 1).toISOString(), "2027-01-15T00:00:00.000Z");
});

test("getPlan — returns the catalog entry by code", () => {
  const p = getPlan("individual_monthly");
  assert.equal(typeof p, "object");
  assert.equal(p.tier, "Individual");
  assert.equal(p.priceUsd, 5);
});

test("getPlan — unknown code throws", () => {
  assert.throws(() => getPlan("not_a_plan"), /Unknown plan/);
});

test("PLAN_CATALOG — reflects founder-approved pricing override ($5/$30/$10/$60)", () => {
  // PRD §10.1 originally said $2/$20/$5/$50; founder approved $5/$30/$10/$60.
  assert.equal(PLAN_CATALOG.individual_monthly.priceUsd, 5);
  assert.equal(PLAN_CATALOG.individual_yearly.priceUsd, 30);
  assert.equal(PLAN_CATALOG.business_monthly.priceUsd, 10);
  assert.equal(PLAN_CATALOG.business_yearly.priceUsd, 60);
});

test("isWithin13MonthCap — 11 months ahead still within cap", () => {
  const now = new Date("2026-05-31T00:00:00Z");
  const expiry = new Date("2027-05-01T00:00:00Z"); // 11 months ahead
  assert.equal(isWithin13MonthCap(expiry, now), true);
});

test("isWithin13MonthCap — 14 months ahead exceeds cap", () => {
  const now = new Date("2026-05-31T00:00:00Z");
  const expiry = new Date("2027-08-01T00:00:00Z");
  assert.equal(isWithin13MonthCap(expiry, now), false);
});

test("computeNextPeriod — no current expiry + no trial starts now", () => {
  const now = new Date("2026-05-31T00:00:00Z");
  const result = computeNextPeriod({
    planCode: "individual_monthly",
    currentExpiry: null,
    hasTrial: false,
    now,
  });
  assert.equal(result.periodStart.toISOString(), now.toISOString());
  // 1 month from now
  assert.equal(result.periodEnd.toISOString(), "2026-06-30T00:00:00.000Z");
});

test("computeNextPeriod — yearly extension stacks from current expiry", () => {
  const now = new Date("2026-05-31T00:00:00Z");
  const currentExpiry = new Date("2026-06-15T00:00:00Z");
  const result = computeNextPeriod({
    planCode: "individual_yearly",
    currentExpiry,
    hasTrial: false,
    now,
  });
  // Yearly extension adds 12 months to existing expiry
  assert.equal(result.periodEnd.toISOString(), "2027-06-15T00:00:00.000Z");
});
