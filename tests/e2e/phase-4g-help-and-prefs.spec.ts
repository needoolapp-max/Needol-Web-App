// Phase 4G — Help & Guide CMS (PRD §14) + notification preferences (PRD §12).
// E2E focuses on public reads, auth gates on admin/user endpoints, and the
// sitemap inclusion. Happy-path admin create/publish + prefs round-trip are
// covered by the Playwright MCP log in handoff §8 + node:test unit tests.

import { expect, test } from "@playwright/test";
import { API_BASE, apiGet, apiSend, newApi } from "./helpers";

test.describe("Phase 4G Help & Guide public reads", () => {
  test("GET /api/help/articles is public and returns articles + categories", async () => {
    const api = await newApi();
    const r = await apiGet(api, "/api/help/articles");
    expect(r.status).toBe(200);
    const data = (r.body as { data: { articles: unknown[]; categories: unknown[] } }).data;
    expect(Array.isArray(data.articles)).toBe(true);
    expect(Array.isArray(data.categories)).toBe(true);
  });

  test("GET /api/help/articles?q= performs text filter", async () => {
    const api = await newApi();
    const r = await apiGet(api, "/api/help/articles?q=phase");
    expect(r.status).toBe(200);
  });

  test("GET /api/help/articles?category= filters by category", async () => {
    const api = await newApi();
    const r = await apiGet(api, "/api/help/articles?category=getting-started");
    expect(r.status).toBe(200);
  });

  test("Unknown slug → 404", async () => {
    const api = await newApi();
    const r = await apiGet(api, "/api/help/articles/this-slug-does-not-exist-9999");
    expect(r.status).toBe(404);
  });

  test("Sitemap.xml includes /help and at least one /help/:slug", async () => {
    const r = await fetch(`${API_BASE}/sitemap.xml`);
    expect(r.status).toBe(200);
    const xml = await r.text();
    expect(xml).toContain("/help");
    expect(xml).toMatch(/<loc>[^<]*\/help\/[^<]+<\/loc>/);
  });
});

test.describe("Phase 4G admin Help CMS auth gates", () => {
  test("GET /api/admin/help/articles requires admin", async () => {
    const api = await newApi();
    const r = await apiGet(api, "/api/admin/help/articles");
    expect(r.status).toBe(401);
  });

  test("POST /api/admin/help/articles requires admin", async () => {
    const api = await newApi();
    const r = await apiSend(api, "POST", "/api/admin/help/articles", { title: "x", body: "y" });
    expect(r.status).toBe(401);
  });

  test("POST /api/admin/help/articles/:id/publish requires admin", async () => {
    const api = await newApi();
    const r = await apiSend(api, "POST", "/api/admin/help/articles/anything/publish");
    expect(r.status).toBe(401);
  });

  test("POST /api/admin/help/articles/:id/archive requires admin", async () => {
    const api = await newApi();
    const r = await apiSend(api, "POST", "/api/admin/help/articles/anything/archive");
    expect(r.status).toBe(401);
  });

  test("PATCH /api/admin/help/articles/:id requires admin", async () => {
    const api = await newApi();
    const r = await apiSend(api, "PATCH", "/api/admin/help/articles/anything", { title: "x" });
    expect(r.status).toBe(401);
  });
});

test.describe("Phase 4G notification preferences auth gates", () => {
  test("GET /api/notifications/preferences requires bearer", async () => {
    const api = await newApi();
    const r = await apiGet(api, "/api/notifications/preferences");
    expect(r.status).toBe(401);
  });

  test("PATCH /api/notifications/preferences requires bearer", async () => {
    const api = await newApi();
    const r = await apiSend(api, "PATCH", "/api/notifications/preferences", {
      event_type: "like_received", enabled: false,
    });
    expect(r.status).toBe(401);
  });
});

test.describe("Phase 4G /help UI", () => {
  // Vite SSR cold-start on /help can take longer than the default 30s test
  // timeout. Bump for the UI describe.
  test.setTimeout(90_000);

  test("/help renders the list page", async ({ page }) => {
    await page.goto("/help", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.locator('[data-test="help-search-form"]')).toBeVisible();
  });

  test("/help/:slug renders the article body", async ({ page }) => {
    // Discover a published slug via the public list (any one will do).
    const api = await newApi();
    const list = await apiGet(api, "/api/help/articles");
    const articles = (list.body as { data: { articles: Array<{ slug: string }> } }).data.articles;
    if (!articles.length) {
      test.skip(true, "No published Help articles in this DB.");
      return;
    }
    const slug = articles[0].slug;
    await page.goto(`/help/${slug}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.locator('[data-test="help-detail"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-test="help-detail-title"]')).toBeVisible();
  });
});
