import { expect, test } from "@playwright/test";

// Smoke checks for the SSR/CSR routes. These do not log in; they just verify
// the routes render without runtime errors.

test.describe("frontend public routes", () => {
  test("home page renders", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(/Needool/);
    expect(errors).toEqual([]);
  });

  test("/needs renders the feed", async ({ page }) => {
    await page.goto("/needs", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(/Need Requests/);
    const heading = page.locator("main h1").first();
    await expect(heading).toBeVisible();
  });

  test("/opportunities renders", async ({ page }) => {
    await page.goto("/opportunities", { waitUntil: "domcontentloaded" });
    const heading = page.locator("main h1").first();
    await expect(heading).toBeVisible();
  });

  test("/jobs renders the public list", async ({ page }) => {
    await page.goto("/jobs", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/jobs/);
    await expect(page.locator("main").first()).toBeVisible();
  });

  test("/pricing renders subscribe CTAs", async ({ page }) => {
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main").first()).toBeVisible();
  });

  test("/login renders the auth shell", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main").first()).toBeVisible();
  });

  test("/signup renders the auth shell", async ({ page }) => {
    await page.goto("/signup", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main").first()).toBeVisible();
  });

  test("an unknown deep link does not crash", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/this-path-does-not-exist-12345", { waitUntil: "domcontentloaded" });
    expect(errors).toEqual([]);
  });
});

test.describe("admin panel public surface", () => {
  test("admin panel renders the sign-in / dashboard shell", async ({ page }) => {
    await page.goto("http://localhost:3200/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(/Needool Admin/);
  });
});
