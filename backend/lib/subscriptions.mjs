export const PLAN_CATALOG = {
  individual_monthly: { tier: "Individual", cycle: "monthly", priceUsd: 5, months: 1 },
  individual_yearly: { tier: "Individual", cycle: "yearly", priceUsd: 30, months: 12 },
  business_monthly: { tier: "Business", cycle: "monthly", priceUsd: 10, months: 1 },
  business_yearly: { tier: "Business", cycle: "yearly", priceUsd: 60, months: 12 },
};

export function getPlan(planCode) {
  const plan = PLAN_CATALOG[planCode];
  if (!plan) throw new Error(`Unknown plan: ${planCode}`);
  return plan;
}

export function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  if (d.getUTCDate() < day) d.setUTCDate(0);
  return d;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export const MAX_FORWARD_MONTHS = 13;

// PRD §10.4 — no expiry can exceed 13 months from now.
export function isWithin13MonthCap(proposedExpiry, now = new Date()) {
  const cap = addMonths(now, MAX_FORWARD_MONTHS);
  return proposedExpiry.getTime() <= cap.getTime();
}

// PRD §10.5 — re-sub windows. Only applies if user is currently active.
// First-activation from inactive always allowed.
export function isWithinResubWindow(currentExpiry, planCode, now = new Date()) {
  const plan = getPlan(planCode);
  if (!currentExpiry) return true;
  const ms = currentExpiry.getTime() - now.getTime();
  const days = ms / (1000 * 60 * 60 * 24);
  if (plan.cycle === "yearly") return days <= 30;
  return days <= 10;
}

// PRD §10.3 — referred user gets 7-day trial; subscription extends from the later of
// (now, trial_end). Non-referred users have no trial.
export function computeNextPeriod({ planCode, currentExpiry, hasTrial, now = new Date() }) {
  const plan = getPlan(planCode);
  const baseline = currentExpiry && currentExpiry > now ? currentExpiry : now;
  const trialAware = hasTrial && !currentExpiry
    ? new Date(Math.max(baseline.getTime(), addDays(now, 7).getTime()))
    : baseline;
  const periodEnd = addMonths(trialAware, plan.months);
  return {
    periodStart: now,
    periodEnd,
    plan,
  };
}

export function planLabel(planCode) {
  const plan = getPlan(planCode);
  return `${plan.tier} ${plan.cycle}`;
}
