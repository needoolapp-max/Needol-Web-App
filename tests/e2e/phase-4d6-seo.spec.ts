// Phase 4D-6 — SEO (PRD §4.4): schema.org JSON-LD, sitemap, OG + Twitter,
// canonical URLs.

import { expect, test } from "@playwright/test";
import { API_BASE } from "./helpers";

test.describe("Phase 4D-6 sitemap + robots", () => {
  test("/sitemap.xml returns valid XML with the public site sections", async () => {
    const r = await fetch(`${API_BASE}/sitemap.xml`);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toMatch(/application\/xml/);
    const xml = await r.text();
    expect(xml.startsWith('<?xml')).toBe(true);
    // Must include the public landing pages.
    expect(xml).toContain("/needs");
    expect(xml).toContain("/opportunities");
    expect(xml).toContain("/jobs");
    expect(xml).toContain("/events");
  });

  test("/sitemap.xml includes at least one /p/:username and one /posts/:id", async () => {
    const r = await fetch(`${API_BASE}/sitemap.xml`);
    const xml = await r.text();
    // Phase 4D test users + Phase 4F seeded posts should be present.
    expect(xml).toMatch(/<loc>[^<]*\/p\/[^<]+<\/loc>/);
    expect(xml).toMatch(/<loc>[^<]*\/posts\/[^<]+<\/loc>/);
  });

  test("/robots.txt is served and references sitemap.xml", async () => {
    const r = await fetch(`${API_BASE}/robots.txt`);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toMatch(/text\/plain/);
    const body = await r.text();
    expect(body).toMatch(/User-agent: \*/);
    expect(body).toMatch(/Sitemap: .*sitemap\.xml/);
  });
});

test.describe("Phase 4D-6 profile page SEO surface", () => {
  test("profile page emits canonical + og:type=profile + JSON-LD Person", async ({ page }) => {
    await page.goto("/p/needoolclerktest", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.locator("main h1").first()).toBeVisible();

    // Canonical link
    const canonical = await page.locator('link[rel="canonical"]').first().getAttribute("href");
    expect(canonical).toMatch(/\/p\/needoolclerktest$/);

    // OG meta
    expect(await page.locator('meta[property="og:type"]').first().getAttribute("content")).toBe("profile");
    expect(await page.locator('meta[property="og:title"]').first().getAttribute("content")).toContain("needoolclerktest");
    expect(await page.locator('meta[name="twitter:card"]').first().getAttribute("content")).toBe("summary_large_image");

    // JSON-LD lands once live data is fetched. Script lives in <head> so it
    // never has a visible box — use waitForFunction to check presence. Wait
    // longer because Clerk init + live fetch can be slow on first page load.
    await page.waitForFunction(
      () => !!document.getElementById("needool-profile-jsonld"),
      undefined,
      { timeout: 30_000 },
    );
    const ldText = await page.locator("#needool-profile-jsonld").textContent();
    const ld = JSON.parse(ldText || "{}");
    expect(ld["@context"]).toBe("https://schema.org");
    expect(["Person", "LocalBusiness"]).toContain(ld["@type"]);
    expect(ld.url).toMatch(/\/p\/needoolclerktest$/);
  });
});

test.describe("Phase 4D-6 post detail SEO surface", () => {
  test("post page emits canonical + og:type=article", async ({ page }) => {
    // Use a known seed post id from Phase 4F.
    await page.goto("/posts/0d2c627e-4060-45a2-9789-f202a0f1bb4b", {
      waitUntil: "domcontentloaded", timeout: 60_000,
    });
    const canonical = await page.locator('link[rel="canonical"]').first().getAttribute("href");
    expect(canonical).toMatch(/\/posts\//);
    expect(await page.locator('meta[property="og:type"]').first().getAttribute("content")).toBe("article");
  });
});
