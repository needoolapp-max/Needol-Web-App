import { defineConfig, devices } from "@playwright/test";

// Drives the local dev stack (backend :4100, frontend :3000, admin :3200).
// Start the stack manually before running:
//   npm --prefix backend run dev
//   npm --workspace frontend run dev
//   npm --workspace admin-panel run dev
//
// Tests assume the Phase 4C migration has been applied in Supabase.

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  expect: {
    timeout: 10_000,
  },
});
