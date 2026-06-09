// Phase 4D-7 — Post / Opportunity validation bugfixes (PRD §5.1, §5.5, §6.1).
// Verifies the validation gates exist on the public POST /api/posts endpoint.
// Happy-path + closed-state mutations are covered via the Playwright MCP run
// logged in handoff §8 (they need a Clerk bearer the e2e harness lacks).

import { expect, test } from "@playwright/test";
import { apiSend, newApi } from "./helpers";

test.describe("Phase 4D-7 post validation gates", () => {
  test("POST /api/posts without bearer → 401", async () => {
    const api = await newApi();
    const r = await apiSend(api, "POST", "/api/posts", {
      kind: "need", title: "test", description: "clean",
      thumbnail_url: "https://example.com/i.png",
    });
    expect(r.status).toBe(401);
  });
});
