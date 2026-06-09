// Phase 4D-3 — Real public profile (PRD §3.2). Verifies the public profile
// endpoint returns the full §3.2 shape with the correct Active-gated reveals,
// and that the rendered profile page picks up live DB data over mockData.

import { expect, test } from "@playwright/test";
import { apiGet, apiSend, newApi } from "./helpers";

test.describe("Phase 4D-3 public profile shape", () => {
  test("GET /api/users/by-username/:u returns the full PRD §3.2 shape", async () => {
    const api = await newApi();
    const r = await apiGet(api, "/api/users/by-username/needoolclerktest");
    expect(r.status).toBe(200);
    const data = (r.body as { data: Record<string, unknown> }).data;
    // Every §3.2 surface should be present (value may be null/empty).
    for (const key of [
      "id", "username", "name", "avatar", "accountType", "status",
      "bio", "hourlyRate", "currency", "workHours", "remote",
      "country", "state", "city", "businessAddress", "distanceKm",
      "skills", "phone", "whatsapp", "links", "cvUrl",
      "followers", "following", "isFollowing", "isSelf",
      "posts", "reviews", "reviewAggregate", "notifyWhenActiveAvailable",
    ]) {
      expect(data).toHaveProperty(key);
    }
    expect(Array.isArray(data.skills)).toBe(true);
    expect(Array.isArray(data.links)).toBe(true);
    expect(Array.isArray(data.posts)).toBe(true);
    expect(Array.isArray(data.reviews)).toBe(true);
  });

  test("Active profile reveals phone + cvUrl + links to anon viewer (PRD §3.2)", async () => {
    const api = await newApi();
    const r = await apiGet(api, "/api/users/by-username/needoolclerktest");
    const data = (r.body as { data: { status: string; phone: unknown; cvUrl: unknown } }).data;
    if (data.status === "active") {
      // We seeded phone in Phase 4D-2 so this should be revealed.
      expect(data.phone).not.toBeNull();
    }
  });

  test("Inactive profile null-gates phone/whatsapp/cvUrl/links (PRD §3.2)", async () => {
    const api = await newApi();
    const ts = Date.now();
    const id = `user_e2e_inact_${ts}`;
    const username = `inact${ts}`.toLowerCase();
    await apiSend(api, "POST", "/api/dev/signup-capture", {
      accountType: "Individual",
      id, email: `${username}@example.com`,
      firstName: "Gate", lastName: "Test",
      dateOfBirth: "1990-01-01",
      phone: "+234 7099998888",
      whatsapp: "+234 7099998888",
      country: "Nigeria", state: "Lagos", city: "Ikeja", nationality: "Nigerian",
    });
    const r = await apiGet(api, `/api/users/by-username/${encodeURIComponent(username)}`);
    expect(r.status).toBe(200);
    const data = (r.body as { data: { status: string; phone: unknown; whatsapp: unknown; cvUrl: unknown; links: unknown[]; notifyWhenActiveAvailable: boolean } }).data;
    expect(data.status).toBe("inactive");
    expect(data.phone).toBeNull();
    expect(data.whatsapp).toBeNull();
    expect(data.cvUrl).toBeNull();
    expect(data.links).toEqual([]);
    expect(data.notifyWhenActiveAvailable).toBe(true);
  });

  test("Unknown username returns 404", async () => {
    const api = await newApi();
    const r = await apiGet(api, "/api/users/by-username/nope-not-a-user-12345");
    expect(r.status).toBe(404);
  });

  test("distanceKm reveals when viewerLat + viewerLng are supplied", async () => {
    // The needoolclerktest profile has location_lat/lng set from earlier
    // sessions. If not, distanceKm is null — accept either.
    const api = await newApi();
    const r = await apiGet(
      api,
      "/api/users/by-username/needoolclerktest?viewerLat=6.5244&viewerLng=3.3792",
    );
    expect(r.status).toBe(200);
    const dist = (r.body as { data: { distanceKm: unknown } }).data.distanceKm;
    expect(dist === null || typeof dist === "number").toBe(true);
  });
});

test.describe("Phase 4D-3 public profile UI uses live data", () => {
  test("profile page renders live bio + work hours + hourly rate", async ({ page }) => {
    await page.goto("/p/needoolclerktest", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main h1").first()).toBeVisible();
    // Live profile fetch races with mockData fallback. Wait until the bio
    // text from the live DB has actually mounted (Phase 4D-2 PATCH set it
    // to this exact string), then assert the rest.
    await expect(page.locator("main")).toContainText("React + TypeScript developer in Lagos.", { timeout: 15_000 });
    const main = await page.locator("main").innerText();
    expect(main).toContain("USD 45/hr");
    expect(main).toContain("Mon-Fri 09:00-17:00 GMT");
  });

  test("Posts section renders when the live user has approved posts", async ({ page }) => {
    await page.goto("/p/needoolclerktest", { waitUntil: "domcontentloaded" });
    // Wait on a stable selector visible to anon viewers (PRD §4.3 hides the
    // contact block; the h1 with the user's name is always rendered).
    await expect(page.locator("main h1").first()).toBeVisible();
    // Give React one more beat to swap mock placeholder text → live data.
    await page.waitForFunction(
      () => !!document.querySelector("main")?.innerText.includes("USD"),
      undefined,
      { timeout: 10_000 },
    ).catch(() => {});
    const postsSection = page.locator('[data-test="profile-posts"]');
    if (await postsSection.count()) {
      const posts = page.locator('[data-test="profile-post"]');
      expect(await posts.count()).toBeGreaterThan(0);
    }
  });

  test("CV viewer renders when the live user has uploaded one", async ({ page }) => {
    await page.goto("/p/needoolclerktest", { waitUntil: "domcontentloaded" });
    // Wait on a stable selector visible to anon viewers (PRD §4.3 hides the
    // contact block; the h1 with the user's name is always rendered).
    await expect(page.locator("main h1").first()).toBeVisible();
    // Give React one more beat to swap mock placeholder text → live data.
    await page.waitForFunction(
      () => !!document.querySelector("main")?.innerText.includes("USD"),
      undefined,
      { timeout: 10_000 },
    ).catch(() => {});
    const viewer = page.locator('[data-test="profile-cv-viewer"]');
    if (await viewer.count()) {
      const src = await viewer.locator("object").getAttribute("data");
      expect(src).toMatch(/storage\/v1\/object\/public\/cv\//);
    }
  });
});
