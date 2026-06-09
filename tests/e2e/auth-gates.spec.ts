import { expect, test } from "@playwright/test";
import { apiGet, apiSend, newApi } from "./helpers";

// Every mutating endpoint must reject anonymous callers.

const PROTECTED_GETS = [
  "/api/auth/me",
  "/api/notifications",
  "/api/notifications/unread-count",
  "/api/me/posts",
  "/api/me/saves",
  "/api/me/follows",
  "/api/me/applications",
  "/api/me/verified-hires",
  "/api/withdrawals",
  "/api/referrals/summary",
];

const PROTECTED_MUTATIONS: Array<{ method: "POST" | "PATCH" | "DELETE"; path: string; body?: unknown }> = [
  { method: "POST", path: "/api/posts", body: { kind: "need", title: "x", description: "y" } },
  { method: "POST", path: "/api/withdrawals", body: { amountUsdt: 25, trc20Address: "T".repeat(34), totpCode: "424242" } },
  { method: "POST", path: "/api/posts/abc/like" },
  { method: "DELETE", path: "/api/posts/abc/like" },
  { method: "POST", path: "/api/posts/abc/save" },
  { method: "POST", path: "/api/posts/abc/comments", body: { body: "test" } },
  { method: "POST", path: "/api/users/abc/follow" },
  { method: "POST", path: "/api/profiles/abc/reviews", body: { rating: 4 } },
  { method: "POST", path: "/api/reviews", body: { verifiedHireId: "abc", rating: 4 } },
];

const ADMIN_ENDPOINTS = [
  "/api/admin/overview",
  "/api/admin/users",
  "/api/admin/posts",
  "/api/admin/withdrawals",
  "/api/admin/audit-log",
  "/api/admin/reviews",
  "/api/admin/feature-flags",
  "/api/admin/hire-requests",
  "/api/admin/job-openings",
];

test.describe("auth gates", () => {
  for (const path of PROTECTED_GETS) {
    test(`${path} requires bearer (401)`, async () => {
      const api = await newApi();
      const r = await apiGet(api, path);
      expect(r.status).toBe(401);
    });
  }

  for (const { method, path, body } of PROTECTED_MUTATIONS) {
    test(`${method} ${path} requires bearer (401)`, async () => {
      const api = await newApi();
      const r = await apiSend(api, method, path, body);
      expect(r.status).toBe(401);
    });
  }

  for (const path of ADMIN_ENDPOINTS) {
    test(`${path} requires admin (401 without bearer)`, async () => {
      const api = await newApi();
      const r = await apiGet(api, path);
      expect(r.status).toBe(401);
    });
  }

  test("public hire-request POST is open (validates input)", async () => {
    const api = await newApi();
    const r = await apiSend(api, "POST", "/api/hire-requests", {});
    // Missing required fields → 400, not 401
    expect([400, 422]).toContain(r.status);
  });
});
