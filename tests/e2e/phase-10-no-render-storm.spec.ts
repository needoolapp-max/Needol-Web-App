/**
 * Phase 10 — input freeze regression guard.
 *
 * Catches the production-only freeze where clicking any input on the SPA build
 * locked up the main thread. Root cause: `shellComponent: RootShell` on the
 * root route rendered an SSR-style `<html><head><body>` shell *inside* the
 * existing `<div id="root">` in SPA mode, producing invalid nested DOM that
 * broke focus handling in Chromium/Edge production builds.
 *
 * The dev server never reproduced the freeze (Vite serves source modules,
 * not the SPA prod entry path), so this spec is **prod-build-only**.
 *
 * How to run:
 *
 *   # 1) build the SPA and serve it locally
 *   npm --workspace frontend run build
 *   npx --workspace frontend vite preview --config vite.spa.config.ts --port 3500 &
 *
 *   # 2) point this spec at the preview server
 *   NEEDOOL_PREVIEW_URL=http://localhost:3500 \
 *     npx playwright test tests/e2e/phase-10-no-render-storm.spec.ts
 *
 * Without NEEDOOL_PREVIEW_URL set, the spec skips itself — the dev-mode :3000
 * baseURL would falsely pass even with a regressed prod build.
 */
import { test, expect } from "@playwright/test";

const PREVIEW_URL = process.env.NEEDOOL_PREVIEW_URL;

test.describe("Phase 10 — input typing must not freeze the main thread", () => {
  test.skip(
    !PREVIEW_URL,
    "Requires NEEDOOL_PREVIEW_URL pointing at a built SPA preview (e.g. http://localhost:3500). The Vite dev server does not reproduce this regression.",
  );

  test("clicking + typing into the home page search bar completes within 2s", async ({
    page,
  }) => {
    const base = PREVIEW_URL!.replace(/\/$/, "");
    await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });

    // The home page renders a SearchBar with input[name="q"]. Using this
    // input instead of Clerk's email field keeps the spec independent of
    // Clerk dashboard allowlist state and third-party chunk load latency.
    // Multiple SearchBar instances may exist (header + mobile drawer). Match
    // the visible one. The desktop viewport (1280×720 default) renders the
    // header SearchBar.
    const searchInput = page.locator('input[name="q"]:visible').first();
    await searchInput.waitFor({ state: "visible", timeout: 10_000 });

    const sample = "regression-typing-probe";

    // Focus + type via fill — fill auto-scrolls into view and dispatches a
    // focus event (the freeze triggered on focus, not on typing). Race the
    // keystrokes against a 2s deadline. If the main thread is frozen, fill
    // queues indefinitely and the deadline expires.
    await Promise.race([
      searchInput.fill(sample, { timeout: 2_000 }),
      new Promise((_resolve, reject) =>
        setTimeout(
          () => reject(new Error("Typing did not complete within 2s — main thread likely frozen")),
          2_000,
        ),
      ),
    ]);

    // The input must actually carry the typed value. A frozen page may
    // accept keystrokes silently but never commit React state; checking
    // the DOM value catches both halves.
    await expect(searchInput).toHaveValue(sample, { timeout: 2_000 });
  });
});
