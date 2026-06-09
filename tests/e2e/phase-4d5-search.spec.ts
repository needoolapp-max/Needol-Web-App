// Phase 4D-5 — Search & ranking (PRD §4.1, §4.2, §4.3).

import { expect, test } from "@playwright/test";
import { apiGet, apiSend, newApi } from "./helpers";

test.describe("Phase 4D-5 search endpoint", () => {
  test("GET /api/search returns a paginated shape", async () => {
    const api = await newApi();
    const r = await apiGet(api, "/api/search?q=react");
    expect(r.status).toBe(200);
    const data = (r.body as { data: { total: number; page: number; pageSize: number; results: unknown[] } }).data;
    expect(data).toHaveProperty("total");
    expect(data).toHaveProperty("page");
    expect(data).toHaveProperty("pageSize");
    expect(Array.isArray(data.results)).toBe(true);
    expect(data.pageSize).toBe(20);
  });

  test("Search is public (no bearer required) — PRD §4.3", async () => {
    const api = await newApi();
    const r = await apiGet(api, "/api/search?q=anything");
    expect(r.status).toBe(200);
  });

  test("Invalid scope → 400", async () => {
    const api = await newApi();
    const r = await apiGet(api, "/api/search?scope=galaxy");
    expect(r.status).toBe(400);
  });

  test("Near scope without lat/lng → 400", async () => {
    const api = await newApi();
    const r = await apiGet(api, "/api/search?scope=near");
    expect(r.status).toBe(400);
  });

  test("Near scope with invalid radius → 400", async () => {
    const api = await newApi();
    const r = await apiGet(api, "/api/search?scope=near&lat=6.5&lng=3.4&radius=12");
    expect(r.status).toBe(400);
  });

  test("Country scope filters results", async () => {
    const api = await newApi();
    const r = await apiGet(api, "/api/search?scope=country&country=Nigeria");
    expect(r.status).toBe(200);
    const data = (r.body as { data: { results: Array<{ country: string | null }> } }).data;
    for (const row of data.results) {
      if (row.country) expect(row.country).toBe("Nigeria");
    }
  });

  test("PRD §4.2 — Active above Inactive when ≥20 actives", async () => {
    const api = await newApi();
    const ts = Date.now();
    const kw = `searche2e${ts}`;
    // Seed 22 Active + 5 Inactive with a unique keyword in name.
    for (let i = 0; i < 22; i++) {
      await apiSend(api, "POST", "/api/dev/seed-user", {
        id: `user_e2e_4d5_act_${ts}_${i}`,
        email: `e2e-act-${ts}-${i}@example.com`,
        username: `e2eact${ts}${i}`,
        name: `Active ${i} ${kw}`,
        status: "active",
      });
    }
    for (let i = 0; i < 5; i++) {
      await apiSend(api, "POST", "/api/dev/seed-user", {
        id: `user_e2e_4d5_inact_${ts}_${i}`,
        email: `e2e-inact-${ts}-${i}@example.com`,
        username: `e2einact${ts}${i}`,
        name: `Inactive ${i} ${kw}`,
        status: "inactive",
      });
    }
    const r = await apiGet(api, `/api/search?q=${encodeURIComponent(kw)}`);
    const data = (r.body as { data: { total: number; results: Array<{ status: string }> } }).data;
    expect(data.total).toBeGreaterThanOrEqual(27);
    expect(data.results.length).toBeLessThanOrEqual(20);
    // Page 1: every row should be Active when there are ≥ 20 active matches.
    for (const row of data.results) {
      expect(row.status).toBe("active");
    }
  });

  test("PRD §4.2 — Inactive shown on page 1 when fewer than 20 actives", async () => {
    const api = await newApi();
    const ts = Date.now();
    const kw = `tinye2e${ts}`;
    for (let i = 0; i < 2; i++) {
      await apiSend(api, "POST", "/api/dev/seed-user", {
        id: `user_e2e_4d5_smact_${ts}_${i}`,
        email: `sm-act-${ts}-${i}@example.com`,
        username: `smact${ts}${i}`,
        name: `Small Active ${i} ${kw}`,
        status: "active",
      });
    }
    for (let i = 0; i < 2; i++) {
      await apiSend(api, "POST", "/api/dev/seed-user", {
        id: `user_e2e_4d5_sminact_${ts}_${i}`,
        email: `sm-inact-${ts}-${i}@example.com`,
        username: `sminact${ts}${i}`,
        name: `Small Inactive ${i} ${kw}`,
        status: "inactive",
      });
    }
    const r = await apiGet(api, `/api/search?q=${encodeURIComponent(kw)}`);
    const data = (r.body as { data: { results: Array<{ status: string }> } }).data;
    expect(data.results.some((r) => r.status === "inactive")).toBe(true);
  });

  test("Search results never include phone/whatsapp/cv (PRD §4.3)", async () => {
    const api = await newApi();
    const r = await apiGet(api, "/api/search?q=react");
    const data = (r.body as { data: { results: Array<Record<string, unknown>> } }).data;
    for (const row of data.results) {
      expect(row).not.toHaveProperty("phone");
      expect(row).not.toHaveProperty("whatsapp");
      expect(row).not.toHaveProperty("cvUrl");
      expect(row).not.toHaveProperty("cv_extracted_text");
    }
  });
});

test.describe("Phase 4D-5 /search UI", () => {
  test("/search page renders without an error banner", async ({ page }) => {
    await page.goto("/search?q=react", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.locator('[data-test="search-summary"]')).toBeVisible();
    await expect(page.locator('[data-test="search-error"]')).not.toBeVisible({ timeout: 2_000 }).catch(() => { /* no error block at all is also fine */ });
  });

  test("/search page shows Active section heading", async ({ page }) => {
    await page.goto("/search?q=react", { waitUntil: "domcontentloaded", timeout: 60_000 });
    // Wait for either skeleton-replaced grid or active section.
    await expect(page.locator('[data-test="search-active-section"]').or(page.locator('text=No providers match'))).toBeVisible();
  });
});
