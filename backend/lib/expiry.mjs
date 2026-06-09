// PRD §10.7 — at expiry, account flips Inactive within 15 minutes via a
// scheduled job. PRD §10.7 — renewal reminders at 7, 3, and 1 day before
// expiry. PRD §10.5 — fire a "renewal window now open" notification when a
// user enters their re-sub window (30 days for yearly, 10 days for monthly).
//
// This module is pure: it returns the work to do given a list of subscriptions
// and the current time. The store layer applies the changes and emits
// notifications. The endpoint at /api/dev/run-expiry-tick wires the two and is
// intended to be called by Render Cron (every ~5 minutes) in production.

import { getPlan } from "./subscriptions.mjs";

export const REMINDER_DAYS = [7, 3, 1];
export const YEARLY_WINDOW_DAYS = 30;
export const MONTHLY_WINDOW_DAYS = 10;

function diffDays(future, now) {
  const ms = new Date(future).getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function safeGetPlan(planCode) {
  try {
    return getPlan(planCode);
  } catch {
    return null;
  }
}

// Given a single active subscription, return the list of events that should
// fire at `now`. Each event is { type, payload }.
//
// Events:
//   subscription_expired  — current_period_end is in the past
//   subscription_expiring — exactly 7, 3, or 1 day until expiry
//   renewal_window_open   — exactly entering the re-sub window (yearly ≤30d,
//                           monthly ≤10d) on this tick
//
// `firstWindowEntry` should be true when the days-left hits the window edge.
// We fire renewal_window_open at days-left = 30 (yearly) / 10 (monthly).
export function classifySubscription({ subscription, now }) {
  if (!subscription || subscription.status !== "active") return [];
  const periodEnd = subscription.current_period_end;
  if (!periodEnd) return [];
  const end = new Date(periodEnd);
  if (Number.isNaN(end.getTime())) return [];

  // Expired branch
  if (end.getTime() <= now.getTime()) {
    return [{ type: "subscription_expired", payload: { plan: subscription.plan, periodEnd } }];
  }

  const events = [];
  const daysLeft = diffDays(end, now);

  if (REMINDER_DAYS.includes(daysLeft)) {
    events.push({
      type: "subscription_expiring",
      payload: { daysLeft, plan: subscription.plan, periodEnd },
    });
  }

  const plan = safeGetPlan(subscription.plan);
  if (plan) {
    const windowDays = plan.cycle === "yearly" ? YEARLY_WINDOW_DAYS : MONTHLY_WINDOW_DAYS;
    if (daysLeft === windowDays) {
      events.push({
        type: "renewal_window_open",
        payload: {
          planCycle: plan.cycle,
          plan: subscription.plan,
          periodEnd,
        },
      });
    }
  }

  return events;
}

// Plan a tick across many subscriptions. Returns counts + the per-user
// per-event work the caller will execute.
export function planExpiryTick({ subscriptions, now }) {
  const work = [];
  let expired = 0;
  let expiringWarned = 0;
  let windowOpened = 0;
  for (const sub of subscriptions || []) {
    const events = classifySubscription({ subscription: sub, now });
    for (const ev of events) {
      work.push({ subscription: sub, event: ev });
      if (ev.type === "subscription_expired") expired += 1;
      else if (ev.type === "subscription_expiring") expiringWarned += 1;
      else if (ev.type === "renewal_window_open") windowOpened += 1;
    }
  }
  return { work, summary: { expired, expiringWarned, windowOpened } };
}
