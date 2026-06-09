// Phase 4D-1 — signup field capture (PRD §2.3, §2.4, §2.7).
// Drives the dev capture endpoint + the demographic form UI.

import { expect, test } from "@playwright/test";
import { apiSend, newApi } from "./helpers";

test.describe("Phase 4D-1 signup capture endpoint", () => {
  test("Individual happy path stores all PRD §2.3 fields", async () => {
    const api = await newApi();
    const ts = Date.now();
    const r = await apiSend(api, "POST", "/api/dev/signup-capture", {
      accountType: "Individual",
      id: `user_e2e_indiv_${ts}`,
      email: `e2e-indiv-${ts}@example.com`,
      firstName: "Ada", middleName: "B", lastName: "Okafor",
      sex: "Female", nationality: "Nigerian",
      dateOfBirth: "1990-05-12",
      phone: "+234 7011112222", whatsapp: "+234 7011112222",
      country: "Nigeria", state: "Lagos", city: "Ikeja",
    });
    expect(r.status).toBe(201);
    const raw = (r.body as { data: Record<string, string> }).data;
    expect(raw.first_name).toBe("Ada");
    expect(raw.middle_name).toBe("B");
    expect(raw.last_name).toBe("Okafor");
    expect(raw.sex).toBe("Female");
    expect(raw.nationality).toBe("Nigerian");
    expect(raw.date_of_birth).toBe("1990-05-12");
    expect(raw.phone).toBe("+234 7011112222");
    expect(raw.country).toBe("Nigeria");
    expect(raw.state).toBe("Lagos");
    expect(raw.city).toBe("Ikeja");
  });

  test("Under-18 DOB → 400 with field=date_of_birth (PRD §2.3)", async () => {
    const api = await newApi();
    const ts = Date.now();
    const childDob = new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);
    const r = await apiSend(api, "POST", "/api/dev/signup-capture", {
      accountType: "Individual",
      id: `user_e2e_kid_${ts}`,
      email: `kid-${ts}@example.com`,
      firstName: "Kid", lastName: "Test",
      dateOfBirth: childDob,
    });
    expect(r.status).toBe(400);
    expect((r.body as { field: string; error: string }).field).toBe("date_of_birth");
    expect((r.body as { error: string }).error).toMatch(/18/);
  });

  test("Missing first_name → 400 with field=first_name", async () => {
    const api = await newApi();
    const r = await apiSend(api, "POST", "/api/dev/signup-capture", {
      accountType: "Individual",
      id: `user_e2e_nofn_${Date.now()}`,
      lastName: "NoFirst",
      dateOfBirth: "1990-01-01",
    });
    expect(r.status).toBe(400);
    expect((r.body as { field: string }).field).toBe("first_name");
  });

  test("Typed referrer that does not exist is silently dropped (PRD §2.7)", async () => {
    const api = await newApi();
    const ts = Date.now();
    const r = await apiSend(api, "POST", "/api/dev/signup-capture", {
      accountType: "Individual",
      id: `user_e2e_ghost_${ts}`,
      email: `ghost-${ts}@example.com`,
      firstName: "Ghost", lastName: "Drop",
      dateOfBirth: "1990-01-01",
      referredBy: "NEVER_EXISTED_99999",
    });
    expect(r.status).toBe(201);
    expect((r.body as { data: { referred_by: string | null } }).data.referred_by).toBeNull();
  });

  test("Typed referrer that exists wins over cookie (PRD §2.7)", async () => {
    const api = await newApi();
    const ts = Date.now();
    // Seed a target referrer
    await apiSend(api, "POST", "/api/dev/seed-user", {
      id: `user_referrer_target_${ts}`,
      email: `ref-${ts}@example.com`,
      username: `reftarget${ts}`,
      referralCode: `REFTARGET${ts}`,
    });
    const r = await apiSend(api, "POST", "/api/dev/signup-capture", {
      accountType: "Individual",
      id: `user_e2e_typed_${ts}`,
      email: `typed-${ts}@example.com`,
      firstName: "Typed", lastName: "Wins",
      dateOfBirth: "1990-01-01",
      referredBy: `REFTARGET${ts}`,
      referredByCookie: "NEEDOOLCLERKTEST",
    });
    expect(r.status).toBe(201);
    expect((r.body as { data: { referred_by: string } }).data.referred_by).toBe(`REFTARGET${ts}`);
  });

  test("Business HQ happy path (PRD §2.4)", async () => {
    const api = await newApi();
    const ts = Date.now();
    const r = await apiSend(api, "POST", "/api/dev/signup-capture", {
      accountType: "Business",
      id: `user_e2e_biz_hq_${ts}`,
      email: `biz-hq-${ts}@example.com`,
      businessAddress: "1 Awolowo Rd, Ikoyi",
      officeType: "HQ",
      country: "Nigeria", state: "Lagos", city: "Ikoyi",
    });
    expect(r.status).toBe(201);
    const raw = (r.body as { data: Record<string, string> }).data;
    expect(raw.business_address).toBe("1 Awolowo Rd, Ikoyi");
    expect(raw.office_type).toBe("HQ");
    expect(raw.account_type).toBe("Business");
  });

  test("Business Branch without HQ → 400 with field=hq_address (PRD §2.4)", async () => {
    const api = await newApi();
    const r = await apiSend(api, "POST", "/api/dev/signup-capture", {
      accountType: "Business",
      id: `user_e2e_biz_bad_${Date.now()}`,
      businessAddress: "2 Branch Rd",
      officeType: "Branch",
    });
    expect(r.status).toBe(400);
    expect((r.body as { field: string }).field).toBe("hq_address");
  });

  test("Business Branch with full HQ details passes (PRD §2.4)", async () => {
    const api = await newApi();
    const ts = Date.now();
    const r = await apiSend(api, "POST", "/api/dev/signup-capture", {
      accountType: "Business",
      id: `user_e2e_biz_branch_${ts}`,
      email: `biz-branch-${ts}@example.com`,
      businessAddress: "2 Branch Rd",
      officeType: "Branch",
      hqAddress: "1 Main HQ Rd",
      hqCountry: "Nigeria",
      hqState: "Lagos",
      hqCity: "Lagos Island",
    });
    expect(r.status).toBe(201);
    const raw = (r.body as { data: Record<string, string> }).data;
    expect(raw.office_type).toBe("Branch");
    expect(raw.hq_address).toBe("1 Main HQ Rd");
    expect(raw.hq_country).toBe("Nigeria");
  });
});

test.describe("Phase 4D-1 signup demographic form UI", () => {
  test("demographic form renders all PRD §2.3 fields and prefills referrer from ?ref", async ({ page }) => {
    await page.goto("/signup?ref=NEEDOOLCLERKTEST", { waitUntil: "networkidle" });

    // The page may redirect to /dashboard if browser is signed-in. Tolerate:
    if (!page.url().includes("/signup")) {
      test.skip(true, "Browser is already signed in; skipping demographic form UI check.");
      return;
    }

    await expect(page.locator('[data-test="signup-demographic-form"]')).toBeVisible();
    await expect(page.locator('[data-test="signup-country"]')).toBeVisible();
    await expect(page.locator('[data-test="signup-state"]')).toBeVisible();
    await expect(page.locator('[data-test="signup-city"]')).toBeVisible();
    await expect(page.locator('[data-test="signup-phone"]')).toBeVisible();
    await expect(page.locator('[data-test="signup-nationality"]')).toBeVisible();
    await expect(page.locator('[data-test="signup-dob"]')).toBeVisible();
    await expect(page.locator('[data-test="signup-sex"]')).toBeVisible();
    await expect(page.locator('[data-test="account-type-individual"]')).toBeVisible();
    await expect(page.locator('[data-test="account-type-business"]')).toBeVisible();

    const refValue = await page.locator('[data-test="signup-referred-by"]').inputValue();
    expect(refValue).toBe("NEEDOOLCLERKTEST");
  });

  test("Business toggle swaps the field set to PRD §2.4 inputs", async ({ page }) => {
    await page.goto("/signup", { waitUntil: "networkidle" });
    if (!page.url().includes("/signup")) {
      test.skip(true, "Browser already signed in.");
      return;
    }
    // Make sure the form is mounted before toggling.
    await expect(page.locator('[data-test="signup-demographic-form"]')).toBeVisible();
    await expect(page.locator('[data-test="account-type-business"]')).toBeVisible();
    await page.locator('[data-test="account-type-business"]').click();
    await expect(page.locator('[data-test="signup-business-address"]')).toBeVisible();
    await expect(page.locator('[data-test="signup-office-type"]')).toBeVisible();
  });
});
