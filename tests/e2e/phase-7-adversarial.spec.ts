// Phase 7-5 — Adversarial e2e sweep.
//
// Three categories:
//   A) Unauthenticated mutation sweep — every protected mutation endpoint
//      must return 401 with no bearer.
//   B) Bad-input sweep — every public POST returns 4xx (not 500) for
//      malformed payloads.
//   C) OTP replay + attack sweep — the OTP issued for one email cannot be
//      reused for another, an unrelated id cannot be substituted in
//      hire-request POST, and the email gate cannot be bypassed.
//
// The sad paths here are intentional. Network 4xx is the proof; 500s are
// failures of the suite.

import { expect, test } from "@playwright/test";
import { apiGet, apiSend, newApi } from "./helpers";

// ---------------------------------------------------------------------------
// A) Unauthenticated mutation sweep — 401 expected
// ---------------------------------------------------------------------------

const UNAUTH_MUTATIONS: Array<{ method: "POST" | "PATCH" | "DELETE"; path: string; body?: unknown }> = [
  // Subscriptions
  { method: "POST", path: "/api/subscriptions/initiate", body: { plan: "individual_monthly" } },
  // Posts
  { method: "POST", path: "/api/posts", body: { kind: "need", title: "x", description: "x" } },
  { method: "PATCH", path: "/api/posts/00000000-0000-0000-0000-000000000000/close" },
  // Comments
  { method: "POST", path: "/api/posts/00000000-0000-0000-0000-000000000000/comments", body: { body: "x" } },
  { method: "POST", path: "/api/posts/00000000-0000-0000-0000-000000000000/like" },
  { method: "POST", path: "/api/posts/00000000-0000-0000-0000-000000000000/save" },
  // Jobs
  { method: "POST", path: "/api/jobs/00000000-0000-0000-0000-000000000000/apply", body: { answers: [] } },
  // Reviews
  { method: "POST", path: "/api/reviews", body: { rating: 5 } },
  { method: "POST", path: "/api/reviews/00000000-0000-0000-0000-000000000000/reply", body: { body: "x" } },
  { method: "POST", path: "/api/reviews/00000000-0000-0000-0000-000000000000/report", body: { reason: "spam" } },
  // Profile mutations
  { method: "PATCH", path: "/api/profile", body: { bio: "x" } },
  { method: "POST", path: "/api/profile/links", body: { label: "x", url: "https://x.io" } },
  { method: "POST", path: "/api/profile/skills", body: { kind: "skill", label: "x" } },
  // Notify-when-active is auth-gated
  { method: "POST", path: "/api/profiles/some_user/notify-when-active" },
  // contact-intent is intentionally tolerant per PRD §3.4 (silent 204 for
  // anonymous callers) — covered as its own test below.
  // Withdrawals
  { method: "POST", path: "/api/withdrawals", body: { amountUsdt: 50, trc20Address: "T", totpCode: "424242" } },
  // Notifications + push
  { method: "POST", path: "/api/notifications/read-all" },
  { method: "POST", path: "/api/notifications/push/subscribe", body: { endpoint: "https://x.io/push", keys: { p256dh: "a", auth: "b" } } },
  { method: "DELETE", path: "/api/notifications/push/subscribe", body: { endpoint: "https://x.io/push" } },
];

test.describe("Phase 7-5 — Unauthenticated mutation sweep (401 expected)", () => {
  for (const op of UNAUTH_MUTATIONS) {
    test(`${op.method} ${op.path} → 401 without bearer`, async () => {
      const api = await newApi();
      const r = await apiSend(api, op.method, op.path, op.body);
      expect(
        [401, 403],
        `Expected 401/403 from ${op.method} ${op.path}, got ${r.status}: ${JSON.stringify(r.body).slice(0, 200)}`,
      ).toContain(r.status);
    });
  }
});

// ---------------------------------------------------------------------------
// Admin-only sweep — 401 (no bearer) is still the right answer since the
// admin gate runs after the auth gate. Confirming any non-admin caller gets
// blocked before reaching admin logic.
// ---------------------------------------------------------------------------

const ADMIN_GATES: Array<{ method: "GET" | "POST" | "PATCH"; path: string; body?: unknown }> = [
  { method: "GET", path: "/api/admin/overview" },
  { method: "GET", path: "/api/admin/audit-log" },
  { method: "GET", path: "/api/admin/users" },
  { method: "GET", path: "/api/admin/posts" },
  { method: "POST", path: "/api/admin/posts", body: { kind: "need", title: "x" } },
  { method: "GET", path: "/api/admin/withdrawals" },
  { method: "GET", path: "/api/admin/hire-requests" },
  { method: "GET", path: "/api/admin/job-openings" },
  { method: "GET", path: "/api/admin/help/articles" },
];

test.describe("Phase 7-5 — Admin gate sweep (401 expected for unauth callers)", () => {
  for (const op of ADMIN_GATES) {
    test(`${op.method} ${op.path} → 401 or 403 without admin bearer`, async () => {
      const api = await newApi();
      const r = op.method === "GET"
        ? await apiGet(api, op.path)
        : await apiSend(api, op.method, op.path, op.body);
      expect(
        [401, 403],
        `Expected 401/403 from ${op.method} ${op.path}, got ${r.status}`,
      ).toContain(r.status);
    });
  }
});

// ---------------------------------------------------------------------------
// B) Public POST bad-input sweep — 4xx expected, never 5xx
// ---------------------------------------------------------------------------

const HUGE = "x".repeat(20_000);

const PUBLIC_BAD_POSTS: Array<{ name: string; path: string; body: unknown; expect4xx?: boolean }> = [
  // OTP request — bad email
  { name: "otp/request with empty email", path: "/api/hire-requests/otp/request", body: { email: "" } },
  { name: "otp/request with non-email string", path: "/api/hire-requests/otp/request", body: { email: "no-at-sign" } },
  { name: "otp/request with huge email", path: "/api/hire-requests/otp/request", body: { email: HUGE } },
  // OTP verify — bad code
  { name: "otp/verify with non-numeric code", path: "/api/hire-requests/otp/verify", body: { email: "a@b.co", code: "abcdef" } },
  { name: "otp/verify with 5-digit code", path: "/api/hire-requests/otp/verify", body: { email: "a@b.co", code: "12345" } },
  { name: "otp/verify with 7-digit code", path: "/api/hire-requests/otp/verify", body: { email: "a@b.co", code: "1234567" } },
  // hire-requests — missing OTP id
  { name: "hire-requests with missing otp_verification_id", path: "/api/hire-requests", body: {
    employer_name: "x", contact_email: "a@b.co", role_title: "x", job_description: "x",
  }},
  // hire-requests — missing required fields
  { name: "hire-requests with missing role_title", path: "/api/hire-requests", body: {
    employer_name: "x", contact_email: "a@b.co", job_description: "x", otp_verification_id: "00000000-0000-0000-0000-000000000000",
  }},
  // hire-requests — bad email
  { name: "hire-requests with bad email", path: "/api/hire-requests", body: {
    employer_name: "x", contact_email: HUGE, role_title: "x", job_description: "x", otp_verification_id: "00000000-0000-0000-0000-000000000000",
  }},
  // reviews/by-token — bad token
  { name: "reviews/by-token with bogus token", path: "/api/reviews/by-token", body: { token: "not-real", rating: 5 } },
  { name: "reviews/by-token with missing rating", path: "/api/reviews/by-token", body: { token: "x" } },
  // employer/me — missing token
  // (GET; covered separately below)
];

test.describe("Phase 7-5 — Public bad-input sweep (4xx expected, never 5xx)", () => {
  for (const item of PUBLIC_BAD_POSTS) {
    test(item.name, async () => {
      const api = await newApi();
      const r = await apiSend(api, "POST", item.path, item.body);
      expect(
        r.status,
        `Expected 4xx for "${item.name}", got ${r.status}: ${JSON.stringify(r.body).slice(0, 200)}`,
      ).toBeGreaterThanOrEqual(400);
      expect(r.status, `Expected 4xx, got 5xx for "${item.name}"`).toBeLessThan(500);
    });
  }
});

test("PRD §3.4 — anonymous POST /api/profiles/:id/contact-intent silently 204s (not 401)", async () => {
  // Intentional design: client logic is simpler if it always fires; backend
  // no-ops the write when there's no session so no PII / notification leaks.
  const api = await newApi();
  const r = await apiSend(api, "POST", "/api/profiles/some_user/contact-intent", { type: "phone" });
  expect(r.status, "expected 204 silent no-op for anonymous caller").toBe(204);
});

test.describe("Phase 7-5 — GET /api/employer/me bad-input sweep", () => {
  test("missing token → 400", async () => {
    const api = await newApi();
    const r = await apiGet(api, "/api/employer/me");
    expect(r.status).toBe(400);
  });
  test("bogus token → 404", async () => {
    const api = await newApi();
    const r = await apiGet(api, "/api/employer/me?token=not-a-real-token");
    expect(r.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// C) OTP attack sweep (PRD §8.1)
// ---------------------------------------------------------------------------

test.describe("Phase 7-5 — OTP attack sweep", () => {
  test("OTP issued for email A cannot verify with code attempt against email B", async () => {
    const api = await newApi();
    // Issue an OTP for A.
    const issue = await apiSend(api, "POST", "/api/hire-requests/otp/request", {
      email: `phase7-victim-${Date.now()}@example.com`,
    });
    expect(issue.status).toBe(200);
    // Attacker tries to verify with email B + a brute-force code.
    const attack = await apiSend(api, "POST", "/api/hire-requests/otp/verify", {
      email: "attacker@example.com",
      code: "123456",
    });
    expect(attack.status).toBeGreaterThanOrEqual(400);
  });

  test("Random uuid as otp_verification_id is rejected at hire-request POST", async () => {
    const api = await newApi();
    const r = await apiSend(api, "POST", "/api/hire-requests", {
      employer_name: "x",
      contact_email: "anyone@example.com",
      role_title: "x",
      job_description: "x",
      otp_verification_id: "11111111-2222-3333-4444-555555555555",
    });
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(r.status).toBeLessThan(500);
  });

  test("Invalid 6-digit code attempts on a real email don't 5xx", async () => {
    const api = await newApi();
    const email = `phase7-brute-${Date.now()}@example.com`;
    await apiSend(api, "POST", "/api/hire-requests/otp/request", { email });
    // Burn 5 bad attempts; each should be 4xx, never 5xx.
    for (let i = 0; i < 5; i++) {
      const r = await apiSend(api, "POST", "/api/hire-requests/otp/verify", { email, code: "000000" });
      expect(r.status).toBeGreaterThanOrEqual(400);
      expect(r.status).toBeLessThan(500);
    }
  });
});

// ---------------------------------------------------------------------------
// D) Webhook signature sweep
// ---------------------------------------------------------------------------

test.describe("Phase 7-5 — Webhook signature sweep", () => {
  test("NOWPayments webhook without signature header is rejected", async () => {
    const api = await newApi();
    const r = await apiSend(api, "POST", "/api/webhooks/nowpayments", {
      payment_id: "x",
      payment_status: "finished",
      order_id: "u.x.individual_monthly.1700000000",
    });
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(r.status).toBeLessThan(500);
  });

  test("Clerk webhook without svix signature is rejected", async () => {
    const api = await newApi();
    const r = await apiSend(api, "POST", "/api/webhooks/clerk", {
      type: "user.created",
      data: { id: "user_x" },
    });
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(r.status).toBeLessThan(500);
  });
});

// ---------------------------------------------------------------------------
// E) Public read endpoints — happy path 200 + bad-input 4xx
// ---------------------------------------------------------------------------

const PUBLIC_READS = [
  "/health",
  "/api/posts?kind=need",
  "/api/needs",
  "/api/opportunities",
  "/api/events",
  "/api/jobs",
  "/api/search?q=lagos",
  "/api/help/articles",
  "/sitemap.xml",
];

test.describe("Phase 7-5 — Public reads return 200", () => {
  for (const path of PUBLIC_READS) {
    test(`GET ${path}`, async () => {
      const api = await newApi();
      const r = await apiGet(api, path);
      expect(r.status, `GET ${path} returned ${r.status}`).toBe(200);
    });
  }
});

test("Search with unknown scope returns 4xx (no 500)", async () => {
  const api = await newApi();
  const r = await apiGet(api, "/api/search?q=x&scope=mars");
  expect(r.status).toBeGreaterThanOrEqual(400);
  expect(r.status).toBeLessThan(500);
});

test("Bogus post id returns 404 not 500", async () => {
  const api = await newApi();
  const r = await apiGet(api, "/api/posts/00000000-0000-0000-0000-000000000000");
  expect([404, 400], `unexpected ${r.status}`).toContain(r.status);
});
