// Phase 4D-2 — profile composition + edit + frequency limits (PRD §3.1, §2.6).
// Live + auth-gate tests only (no Clerk-bearer routes are exercised here because
// the e2e harness has no Clerk session). Mutating profile endpoints get bearer
// gate coverage; happy-path coverage is in backend/test/profile.test.mjs + the
// Playwright MCP run logged in handoff §8.

import { expect, test } from "@playwright/test";
import { apiGet, apiSend, newApi } from "./helpers";

test.describe("Phase 4D-2 profile endpoint auth gates", () => {
  test("GET /api/profile requires bearer", async () => {
    const api = await newApi();
    const r = await apiGet(api, "/api/profile");
    expect(r.status).toBe(401);
  });

  test("PATCH /api/profile requires bearer", async () => {
    const api = await newApi();
    const r = await apiSend(api, "PATCH", "/api/profile", { bio: "hi" });
    expect(r.status).toBe(401);
  });

  test("POST /api/profile/links requires bearer", async () => {
    const api = await newApi();
    const r = await apiSend(api, "POST", "/api/profile/links", {
      label: "Portfolio", url: "https://example.com",
    });
    expect(r.status).toBe(401);
  });

  test("DELETE /api/profile/links/:id requires bearer", async () => {
    const api = await newApi();
    const r = await apiSend(api, "DELETE", "/api/profile/links/anything");
    expect(r.status).toBe(401);
  });

  test("POST /api/profile/skills requires bearer", async () => {
    const api = await newApi();
    const r = await apiSend(api, "POST", "/api/profile/skills", {
      kind: "skill", label: "React",
    });
    expect(r.status).toBe(401);
  });

  test("DELETE /api/profile/skills/:id requires bearer", async () => {
    const api = await newApi();
    const r = await apiSend(api, "DELETE", "/api/profile/skills/anything");
    expect(r.status).toBe(401);
  });

  test("POST /api/profile/picture requires bearer", async () => {
    const api = await newApi();
    const r = await apiSend(api, "POST", "/api/profile/picture");
    expect(r.status).toBe(401);
  });

  test("POST /api/profile/cv requires bearer", async () => {
    const api = await newApi();
    const r = await apiSend(api, "POST", "/api/profile/cv");
    expect(r.status).toBe(401);
  });
});

test.describe("Phase 4D-2 dev backdate helpers", () => {
  test("/api/dev/backdate-frequency rejects missing userId", async () => {
    const api = await newApi();
    const r = await apiSend(api, "POST", "/api/dev/backdate-frequency", {});
    expect(r.status).toBe(400);
  });

  test("/api/dev/backdate-frequency rejects empty patch", async () => {
    const api = await newApi();
    const r = await apiSend(api, "POST", "/api/dev/backdate-frequency", { userId: "user_x" });
    expect(r.status).toBe(400);
  });

  test("/api/dev/backdate-skill rejects missing skillId or createdAt", async () => {
    const api = await newApi();
    const r1 = await apiSend(api, "POST", "/api/dev/backdate-skill", { createdAt: new Date().toISOString() });
    expect(r1.status).toBe(400);
    const r2 = await apiSend(api, "POST", "/api/dev/backdate-skill", { skillId: "x" });
    expect(r2.status).toBe(400);
  });

  test("/api/dev/backdate-frequency persists the patch for a real user", async () => {
    const api = await newApi();
    const ts = Date.now();
    const userId = `user_e2e_freq_${ts}`;
    await apiSend(api, "POST", "/api/dev/seed-user", { id: userId, status: "active" });
    const r = await apiSend(api, "POST", "/api/dev/backdate-frequency", {
      userId,
      phone_updated_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
    });
    expect(r.status).toBe(200);
    const patch = (r.body as { data: { patch: Record<string, string> } }).data.patch;
    expect(patch.phone_updated_at).toBeTruthy();
  });
});
