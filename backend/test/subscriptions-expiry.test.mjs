import assert from "node:assert/strict";
import test from "node:test";
import {
  addMonths,
  computeNextPeriod,
  isWithin13MonthCap,
  isWithinResubWindow,
} from "../lib/subscriptions.mjs";
import { classifySubscription, planExpiryTick } from "../lib/expiry.mjs";

const now = new Date("2026-05-31T00:00:00Z");

test("subscription month arithmetic clamps short months", () => {
  assert.equal(addMonths(new Date("2026-01-31T00:00:00Z"), 1).toISOString(), "2026-02-28T00:00:00.000Z");
});

test("first referred activation adds a seven-day trial before the paid period", () => {
  const result = computeNextPeriod({
    planCode: "individual_monthly",
    currentExpiry: null,
    hasTrial: true,
    now,
  });
  assert.equal(result.periodEnd.toISOString(), "2026-07-07T00:00:00.000Z");
});

test("active subscription stacking obeys resub windows and thirteen-month cap", () => {
  assert.equal(isWithinResubWindow(new Date("2026-06-10T00:00:00Z"), "individual_monthly", now), true);
  assert.equal(isWithinResubWindow(new Date("2026-06-11T00:00:00Z"), "individual_monthly", now), false);
  assert.equal(isWithinResubWindow(new Date("2026-06-30T00:00:00Z"), "individual_yearly", now), true);
  assert.equal(isWithinResubWindow(new Date("2026-07-01T00:00:00Z"), "individual_yearly", now), false);
  assert.equal(isWithin13MonthCap(new Date("2027-06-30T00:00:00Z"), now), true);
  assert.equal(isWithin13MonthCap(new Date("2027-07-01T00:00:00Z"), now), false);
});

test("expiry classifier emits expiry, reminder, and renewal-window events", () => {
  const sub = (plan, current_period_end) => ({ status: "active", plan, current_period_end });
  assert.deepEqual(
    classifySubscription({ subscription: sub("individual_monthly", "2026-05-31T00:00:00Z"), now }).map((e) => e.type),
    ["subscription_expired"],
  );
  assert.deepEqual(
    classifySubscription({ subscription: sub("individual_monthly", "2026-06-03T00:00:00Z"), now }).map((e) => e.type),
    ["subscription_expiring"],
  );
  assert.deepEqual(
    classifySubscription({ subscription: sub("individual_monthly", "2026-06-10T00:00:00Z"), now }).map((e) => e.type),
    ["renewal_window_open"],
  );
  assert.deepEqual(
    classifySubscription({ subscription: sub("individual_yearly", "2026-06-30T00:00:00Z"), now }).map((e) => e.type),
    ["renewal_window_open"],
  );
});

test("expiry tick planner aggregates work across subscriptions", () => {
  const result = planExpiryTick({
    now,
    subscriptions: [
      { id: "expired", status: "active", plan: "individual_monthly", current_period_end: "2026-05-30T00:00:00Z" },
      { id: "warn", status: "active", plan: "individual_monthly", current_period_end: "2026-06-03T00:00:00Z" },
      { id: "window", status: "active", plan: "individual_yearly", current_period_end: "2026-06-30T00:00:00Z" },
    ],
  });
  assert.equal(result.work.length, 3);
  assert.deepEqual(result.summary, { expired: 1, expiringWarned: 1, windowOpened: 1 });
});
