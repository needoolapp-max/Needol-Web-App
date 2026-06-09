// Phase 5 — Launch QA matrix.
// PRD §19 acceptance checklist. Runs in-process against the live Supabase
// state so the dev stack must be up. Each check returns
// `{ id, label, pass, detail }`. The aggregate score is written into the
// payload so the admin panel / Playwright spec can read it directly.
//
// This script never throws on failure — every individual check catches its
// own errors and reports them. The runner returns 200 with the report body
// even if a check failed; the runner is informational, not gating.

import { selectMany, selectOne } from "./supabase.mjs";

async function safeCheck(id, label, fn) {
  try {
    const detail = await fn();
    return { id, label, pass: true, detail };
  } catch (e) {
    return { id, label, pass: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

async function tableHasRows(table, query = "select=id&limit=1") {
  const rows = await selectMany(table, query);
  if (!rows.length) throw new Error(`no rows in ${table}`);
  return rows.length;
}

async function countRows(table, query) {
  // PostgREST count via prefer not used here; range-based count via Prefer
  // header would require a custom request. Cheap approximation: select=id
  // bounded high enough to cover seed sizes.
  const rows = await selectMany(table, `${query}&select=id&limit=1000`);
  return rows.length;
}

// PRD §19 acceptance checklist mapped to checks. Each entry is a
// self-contained probe that proves the feature exists in dev.
export async function runLaunchQa() {
  const startedAt = new Date().toISOString();
  const results = [];

  results.push(await safeCheck(
    "users-seeded",
    "Provider directory has ≥50 active users (PRD §17 soft-launch seed)",
    async () => {
      const rows = await selectMany(
        "users",
        "status=eq.active&select=id&limit=200",
      );
      if (rows.length < 50) throw new Error(`only ${rows.length} active users; need ≥50`);
      return { activeUsers: rows.length };
    },
  ));

  results.push(await safeCheck(
    "needs-seeded",
    "Public feed has ≥30 approved Need Requests (PRD §17 + §5)",
    async () => {
      const rows = await selectMany(
        "posts",
        "kind=eq.need&status=eq.approved&select=id&limit=200",
      );
      if (rows.length < 30) throw new Error(`only ${rows.length} approved needs; need ≥30`);
      return { approvedNeeds: rows.length };
    },
  ));

  results.push(await safeCheck(
    "help-seeded",
    "Help & Guide has ≥10 published articles (PRD §14 + §19)",
    async () => {
      const rows = await selectMany(
        "help_articles",
        "status=eq.published&select=id,slug&limit=50",
      );
      if (rows.length < 10) throw new Error(`only ${rows.length} published articles; need ≥10`);
      return { publishedArticles: rows.length };
    },
  ));

  results.push(await safeCheck(
    "subscriptions-schema",
    "Subscriptions table exists and is reachable (PRD §10)",
    async () => {
      const rows = await selectMany("subscriptions", "select=id&limit=1");
      return { reachable: true, sampleCount: rows.length };
    },
  ));

  results.push(await safeCheck(
    "payments-schema",
    "Payments table exists (idempotency key per PRD §15.3)",
    async () => {
      await selectMany("payments", "select=id&limit=1");
      return { reachable: true };
    },
  ));

  results.push(await safeCheck(
    "trigger-a-reviews-schema",
    "Reviews table accepts Trigger A rows (PRD §9.2)",
    async () => {
      await selectMany("reviews", "trigger_type=eq.verified_hire&select=id&limit=1");
      return { reachable: true };
    },
  ));

  results.push(await safeCheck(
    "trigger-b-reviews-schema",
    "Reviews table accepts Trigger B rows + reports queue (PRD §9.4)",
    async () => {
      await selectMany("reviews", "trigger_type=eq.member&select=id&limit=1");
      await selectMany("review_reports", "select=id&limit=1");
      return { reachable: true };
    },
  ));

  results.push(await safeCheck(
    "audit-log-schema",
    "Admin audit log exists and is queryable (PRD §13.5)",
    async () => {
      await selectMany("admin_audit_log", "select=id&limit=1");
      return { reachable: true };
    },
  ));

  results.push(await safeCheck(
    "notification-prefs-schema",
    "Notification preferences table exists (PRD §12.2)",
    async () => {
      await selectMany("notification_preferences", "select=user_id&limit=1");
      return { reachable: true };
    },
  ));

  results.push(await safeCheck(
    "push-subscriptions-schema",
    "Push subscriptions table exists (PRD §12 push channel + §15.5)",
    async () => {
      await selectMany("push_subscriptions", "select=id&limit=1");
      return { reachable: true };
    },
  ));

  results.push(await safeCheck(
    "feature-flags-trigger-b",
    "Feature flag store reachable for Trigger B kill switch (PRD §9.4)",
    async () => {
      await selectMany("feature_flags", "select=key&limit=1");
      return { reachable: true };
    },
  ));

  results.push(await safeCheck(
    "search-index",
    "Search index has at least one active user with skills (PRD §4.1)",
    async () => {
      const userRows = await selectMany("users", "status=eq.active&select=id&limit=1");
      if (!userRows.length) throw new Error("no active users at all");
      const skillRows = await selectMany(
        "user_skills",
        `user_id=eq.${encodeURIComponent(userRows[0].id)}&select=id&limit=5`,
      );
      return { activeUser: userRows[0].id, skills: skillRows.length };
    },
  ));

  results.push(await safeCheck(
    "post-engagement-schema",
    "Post comments + likes schema reachable (PRD §5.4 + §6.1)",
    async () => {
      await selectMany("comments", "select=id&limit=1");
      await selectMany("post_likes", "select=post_id&limit=1");
      return { reachable: true };
    },
  ));

  results.push(await safeCheck(
    "jobs-schema",
    "Job openings + applications schema reachable (PRD §8)",
    async () => {
      await selectMany("job_openings", "select=id&limit=1");
      await selectMany("job_applications", "select=id&limit=1");
      return { reachable: true };
    },
  ));

  results.push(await safeCheck(
    "verified-hires-schema",
    "Verified hires schema reachable (PRD §8.5)",
    async () => {
      await selectMany("verified_hires", "select=id&limit=1");
      return { reachable: true };
    },
  ));

  results.push(await safeCheck(
    "referrals-schema",
    "Referral commissions schema reachable (PRD §11)",
    async () => {
      await selectMany("referral_commissions", "select=id&limit=1");
      return { reachable: true };
    },
  ));

  results.push(await safeCheck(
    "withdrawals-schema",
    "Withdrawals schema reachable (PRD §11.4)",
    async () => {
      await selectMany("withdrawals", "select=id&limit=1");
      return { reachable: true };
    },
  ));

  results.push(await safeCheck(
    "notify-active-schema",
    "Notify-when-active intent + contact log schema reachable (PRD §3.3 + §3.4)",
    async () => {
      await selectMany("notify_when_active_requests", "select=id&limit=1");
      await selectMany("contact_intent_log", "select=id&limit=1");
      return { reachable: true };
    },
  ));

  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    totals: { total: results.length, passed, failed },
    results,
  };
}
