import { selectMany, selectOne, insertRow, updateRows } from "./supabase.mjs";
import {
  computeNextPeriod,
  getPlan,
  isWithin13MonthCap,
  isWithinResubWindow,
} from "./subscriptions.mjs";
import { activateUser, deactivateUser } from "./users.mjs";
import { emitNotification } from "./notifications-store.mjs";
import { planExpiryTick } from "./expiry.mjs";

export async function getLatestSubscription(userId) {
  return selectOne(
    "subscriptions",
    `user_id=eq.${encodeURIComponent(userId)}&select=*&order=current_period_end.desc`,
  );
}

export class SubscriptionEligibilityError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.status = 400;
  }
}

export async function assertEligibleToSubscribe({ userId, planCode }) {
  getPlan(planCode);
  const latest = await getLatestSubscription(userId);
  const now = new Date();
  if (latest && latest.status === "active") {
    const currentExpiry = new Date(latest.current_period_end);
    if (!isWithinResubWindow(currentExpiry, planCode, now)) {
      throw new SubscriptionEligibilityError(
        "resub_window_closed",
        "Renewal window not open yet. Yearly plans allow renewal within 30 days of expiry; monthly within 10 days.",
      );
    }
    const projected = computeNextPeriod({
      planCode,
      currentExpiry,
      hasTrial: false,
      now,
    }).periodEnd;
    if (!isWithin13MonthCap(projected, now)) {
      throw new SubscriptionEligibilityError(
        "thirteen_month_cap",
        "This plan would push your expiry past the 13-month cap. Try a shorter plan or wait.",
      );
    }
  }
  return latest;
}

export async function activateOrExtendSubscription({
  userId,
  planCode,
  hasTrial,
  providerPaymentId,
}) {
  const latest = await getLatestSubscription(userId);
  const now = new Date();
  const currentExpiry = latest && latest.status === "active"
    ? new Date(latest.current_period_end)
    : null;
  const { periodStart, periodEnd } = computeNextPeriod({
    planCode,
    currentExpiry,
    hasTrial,
    now,
  });

  await insertRow("subscriptions", {
    user_id: userId,
    plan: planCode,
    status: "active",
    current_period_start: periodStart.toISOString(),
    current_period_end: periodEnd.toISOString(),
    trial_end_at: null,
    provider: "nowpayments",
    provider_payment_id: providerPaymentId,
  });

  await activateUser(userId);

  await emitNotification({
    userId,
    eventType: "subscription_activated",
    payload: {
      plan: planCode,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    },
  });
}

// ---------------------------------------------------------------------------
// Expiry / renewal-reminder tick (PRD §10.5, §10.7)
// ---------------------------------------------------------------------------

async function listActiveSubscriptions() {
  return selectMany(
    "subscriptions",
    "status=eq.active&select=*&order=current_period_end.asc&limit=2000",
  );
}

// Returns true if we already emitted an equivalent notification in the
// last 24 hours. Equivalence:
//   subscription_expiring  → same `daysLeft`
//   renewal_window_open    → same `plan`
//   subscription_expired   → any prior expired event for this user
async function alreadyEmittedRecently({ userId, eventType, payload, recentRows }) {
  const cutoffMs = Date.now() - 24 * 60 * 60 * 1000;
  for (const row of recentRows) {
    if (row.user_id !== userId) continue;
    if (row.event_type !== eventType) continue;
    if (new Date(row.created_at).getTime() < cutoffMs) continue;
    if (eventType === "subscription_expired") return true;
    const prior = row.payload || {};
    if (eventType === "subscription_expiring") {
      if (prior.daysLeft === payload.daysLeft) return true;
    } else if (eventType === "renewal_window_open") {
      if (prior.plan === payload.plan) return true;
    }
  }
  return false;
}

async function recentLifecycleNotifications() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  return selectMany(
    "notifications",
    `event_type=in.(subscription_expired,subscription_expiring,renewal_window_open)&created_at=gte.${encodeURIComponent(cutoff)}&select=user_id,event_type,payload,created_at&order=created_at.desc&limit=2000`,
  );
}

export async function runExpiryTick({ now = new Date() } = {}) {
  const subscriptions = await listActiveSubscriptions();
  const { work, summary } = planExpiryTick({ subscriptions, now });
  const recentRows = await recentLifecycleNotifications();

  let expiredApplied = 0;
  let expiringApplied = 0;
  let windowApplied = 0;
  let expiredSkipped = 0;
  let expiringSkipped = 0;
  let windowSkipped = 0;

  for (const item of work) {
    const { subscription: sub, event } = item;
    const eventType = event.type;
    const payload = event.payload || {};

    if (eventType === "subscription_expired") {
      // Always perform the DB flip even if the notification was already sent,
      // so the subscription row converges to `expired`. Skip the notification
      // emission if a recent one exists.
      await updateRows("subscriptions", `id=eq.${encodeURIComponent(sub.id)}`, { status: "expired" });
      try { await deactivateUser(sub.user_id); } catch {}
      const dup = await alreadyEmittedRecently({
        userId: sub.user_id,
        eventType,
        payload,
        recentRows,
      });
      if (dup) {
        expiredSkipped += 1;
      } else {
        await emitNotification({ userId: sub.user_id, eventType, payload });
        recentRows.push({
          user_id: sub.user_id,
          event_type: eventType,
          payload,
          created_at: new Date().toISOString(),
        });
        expiredApplied += 1;
      }
      continue;
    }

    const dup = await alreadyEmittedRecently({
      userId: sub.user_id,
      eventType,
      payload,
      recentRows,
    });
    if (dup) {
      if (eventType === "subscription_expiring") expiringSkipped += 1;
      else if (eventType === "renewal_window_open") windowSkipped += 1;
      continue;
    }
    await emitNotification({ userId: sub.user_id, eventType, payload });
    recentRows.push({
      user_id: sub.user_id,
      event_type: eventType,
      payload,
      created_at: new Date().toISOString(),
    });
    if (eventType === "subscription_expiring") expiringApplied += 1;
    else if (eventType === "renewal_window_open") windowApplied += 1;
  }

  return {
    scanned: subscriptions.length,
    expired: expiredApplied,
    expiringWarned: expiringApplied,
    windowOpened: windowApplied,
    expiredSkipped,
    expiringSkipped,
    windowSkipped,
    planned: summary,
  };
}

export async function devSetSubscriptionExpiry({ subscriptionId, periodEnd }) {
  if (!subscriptionId || !periodEnd) return null;
  await updateRows(
    "subscriptions",
    `id=eq.${encodeURIComponent(subscriptionId)}`,
    { current_period_end: periodEnd, status: "active" },
  );
  return selectOne("subscriptions", `id=eq.${encodeURIComponent(subscriptionId)}&select=*`);
}
