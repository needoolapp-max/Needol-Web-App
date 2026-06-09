// Phase 5 — Launch hardening + content seeding.
// PRD §17 Nigeria soft-launch playbook + §19 acceptance.
//
// 1. /api/dev/seed-* endpoints seed providers / needs / help articles
//    idempotently and the QA matrix reports ≥pass on every §19 lane.
// 2. OG image served from /og-default.svg and referenced from <head>.
// 3. Lighthouse-adjacent smoke + a11y pass on every public route.

import { expect, test } from "@playwright/test";
import { API_BASE, apiGet, apiSend, newApi } from "./helpers";

const PUBLIC_ROUTES = [
  "/",
  "/search",
  "/needs",
  "/opportunities",
  "/events",
  "/jobs",
  "/pricing",
  "/help",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/cookies",
  "/safety",
] as const;

test.describe("Phase 5 — seed endpoints", () => {
  // Seeds round-trip ~100 PostgREST writes. Default action timeout (10s)
  // is too tight; give the seed run a full 90 seconds.
  test.use({ actionTimeout: 90_000 });
  test.setTimeout(180_000);
  test("POST /api/dev/seed-lagos-providers seeds ≥50 active providers (idempotent)", async () => {
    const api = await newApi();
    const r = await apiSend(api, "POST", "/api/dev/seed-lagos-providers", { count: 50 });
    expect(r.status).toBe(200);
    const data = (r.body as { data?: { count: number; inserted: number; updated: number } }).data;
    expect(data?.count).toBeGreaterThanOrEqual(50);
    // Second run must be idempotent — re-run and confirm no new inserts.
    const second = await apiSend(api, "POST", "/api/dev/seed-lagos-providers", { count: 50 });
    const sdata = (second.body as { data?: { inserted: number; updated: number } }).data;
    expect(sdata?.inserted).toBe(0);
    expect(sdata?.updated).toBeGreaterThan(0);
  });

  test("POST /api/dev/seed-need-requests seeds ≥30 approved needs", async () => {
    const api = await newApi();
    const r = await apiSend(api, "POST", "/api/dev/seed-need-requests", { count: 30 });
    expect(r.status).toBe(200);
    const data = (r.body as { data?: { count: number; inserted: number; skipped: number } }).data;
    expect(data?.count).toBeGreaterThanOrEqual(30);
  });

  test("POST /api/dev/seed-help-articles seeds 10 published articles", async () => {
    const api = await newApi();
    const r = await apiSend(api, "POST", "/api/dev/seed-help-articles", undefined);
    expect(r.status).toBe(200);
    const data = (r.body as { data?: { count: number; inserted: number; updated: number } }).data;
    expect(data?.count).toBe(10);
  });

  test("POST /api/dev/seed-all is a single-call composite", async () => {
    const api = await newApi();
    const r = await apiSend(api, "POST", "/api/dev/seed-all", { providers: 50, needs: 30 });
    expect(r.status).toBe(200);
    const data = (r.body as { data?: { providers: unknown; needs: unknown; help: unknown } }).data;
    expect(data?.providers).toBeTruthy();
    expect(data?.needs).toBeTruthy();
    expect(data?.help).toBeTruthy();
  });
});

test.describe("Phase 5 — §19 launch QA matrix", () => {
  test.use({ actionTimeout: 90_000 });
  test.setTimeout(180_000);
  test("POST /api/dev/run-launch-qa returns all-pass after seeds", async () => {
    const api = await newApi();
    // Ensure seeds are applied before reading the matrix.
    await apiSend(api, "POST", "/api/dev/seed-all", { providers: 50, needs: 30 });
    const r = await apiSend(api, "POST", "/api/dev/run-launch-qa", undefined);
    expect(r.status).toBe(200);
    const data = (r.body as {
      data?: { totals: { total: number; passed: number; failed: number }; results: Array<{ id: string; pass: boolean; label: string; detail: unknown }> };
    }).data;
    expect(data?.totals.total).toBeGreaterThanOrEqual(15);
    // Report any failures so the test surface shows the failing lane.
    const failing = (data?.results ?? []).filter((r2) => !r2.pass);
    expect(failing, `Failing §19 checks: ${JSON.stringify(failing, null, 2)}`).toEqual([]);
    expect(data?.totals.failed).toBe(0);
  });
});

test.describe("Phase 5 — OG default asset", () => {
  test.beforeAll(async () => {
    try {
      const r = await fetch("http://localhost:3000/", { redirect: "manual" });
      const body = await r.text();
      if (!/Needool/i.test(body)) {
        test.skip(true, "Frontend on :3000 is not Needool; skipping OG checks");
      }
    } catch {
      test.skip(true, "Frontend on :3000 not reachable; skipping OG checks");
    }
  });

  test("/og-default.svg is served as image/svg+xml", async ({ page }) => {
    const r = await page.request.get("/og-default.svg");
    expect(r.status()).toBe(200);
    const ct = r.headers()["content-type"] || "";
    expect(ct).toMatch(/svg/);
    const body = await r.text();
    expect(body).toContain("Needool");
  });

  test("Home page advertises og:image + twitter:image", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60_000 });
    const og = await page.locator('meta[property="og:image"]').first().getAttribute("content");
    const tw = await page.locator('meta[name="twitter:image"]').first().getAttribute("content");
    expect(og).toContain("og-default");
    expect(tw).toContain("og-default");
  });
});

// PRD §19 — Lighthouse + a11y bar. We can't run Lighthouse without a separate
// dep; the smoke below covers the high-signal subset of Lighthouse + axe
// findings (lang, viewport, title, manifest, img alts, button names).
test.describe("Phase 5 — Lighthouse + a11y smoke (public routes)", () => {
  test.setTimeout(180_000);

  test.beforeAll(async () => {
    // Skip the whole suite if port 3000 isn't actually serving Needool —
    // otherwise these checks would be measuring whatever other dev server
    // happens to be on that port today.
    try {
      const r = await fetch("http://localhost:3000/", { redirect: "manual" });
      const body = await r.text();
      if (!/Needool/i.test(body)) {
        test.skip(true, "Frontend on :3000 is not Needool; skipping a11y smoke");
      }
    } catch {
      test.skip(true, "Frontend on :3000 not reachable; skipping a11y smoke");
    }
  });

  for (const route of PUBLIC_ROUTES) {
    test(`${route}: lang + viewport + title + img alts + button names`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });
      // 1. <html lang="en">
      const lang = await page.locator("html").first().getAttribute("lang");
      expect(lang, `${route} missing <html lang>`).toBeTruthy();
      // 2. viewport meta
      const viewport = await page
        .locator('meta[name="viewport"]')
        .first()
        .getAttribute("content");
      expect(viewport, `${route} missing viewport meta`).toContain("width=device-width");
      // 3. document.title
      const title = await page.title();
      expect(title.length, `${route} title empty`).toBeGreaterThan(3);
      // 4. every <img> must have alt or aria-label or role=presentation
      const imgsMissingAlt = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll("img"));
        return imgs
          .filter((i) => {
            const alt = i.getAttribute("alt");
            const aria = i.getAttribute("aria-label");
            const role = i.getAttribute("role");
            return alt === null && aria === null && role !== "presentation" && role !== "none";
          })
          .map((i) => i.outerHTML.slice(0, 100));
      });
      expect(imgsMissingAlt, `${route} has <img> without alt`).toEqual([]);
      // 5. every <button> must expose an accessible name
      const buttonsMissingName = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        return buttons
          .filter((b) => {
            const text = (b.textContent || "").trim();
            const aria = b.getAttribute("aria-label");
            const title = b.getAttribute("title");
            return !text && !aria && !title;
          })
          .map((b) => b.outerHTML.slice(0, 100));
      });
      expect(buttonsMissingName, `${route} has <button> without accessible name`).toEqual([]);
      // 6. manifest link is present in head (PRD §15.5)
      const manifest = await page.locator('link[rel="manifest"]').first().getAttribute("href");
      expect(manifest, `${route} missing manifest link`).toBeTruthy();
      // 7. zero console errors (Lighthouse 'errors-in-console')
      // Allow the well-known dev-mode hydration warning to pass.
      const blocking = consoleErrors.filter((e) => !e.toLowerCase().includes("hydration"));
      expect(blocking, `${route} console errors:\n${blocking.join("\n")}`).toEqual([]);
    });
  }
});

test.describe("Phase 5 — sitemap coverage", () => {
  test("/sitemap.xml lists seeded public surfaces", async () => {
    const r = await fetch(`${API_BASE}/sitemap.xml`);
    expect(r.status).toBe(200);
    const xml = await r.text();
    for (const path of ["/needs", "/opportunities", "/events", "/help", "/jobs", "/search"]) {
      expect(xml, `sitemap missing ${path}`).toContain(path);
    }
  });
});
