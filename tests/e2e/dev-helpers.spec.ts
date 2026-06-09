import { expect, test } from "@playwright/test";
import { apiGet, apiSend, newApi } from "./helpers";

// Validates that backend dev-only endpoints are mounted in development.
// These are critical for Phase 3C/4C verification + test seeding.

test.describe("dev-only endpoints (NODE_ENV=development)", () => {
  test("simulate-webhook accepts payload", async () => {
    const api = await newApi();
    const r = await apiSend(api, "POST", "/api/dev/simulate-webhook", {
      payment_id: `e2e_smoke_${Date.now()}`,
      payment_status: "finished",
      order_id: `u.user_does_not_exist.individual_monthly.${Date.now()}`,
    });
    // unknown user → handler returns applied=false but the endpoint is reachable
    expect([200, 400, 404]).toContain(r.status);
  });

  test("run-expiry-tick is callable and idempotent", async () => {
    const api = await newApi();
    const r1 = await apiSend(api, "POST", "/api/dev/run-expiry-tick", {});
    const r2 = await apiSend(api, "POST", "/api/dev/run-expiry-tick", {});
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    const a = (r1.body as { data: { scanned: number } }).data;
    const b = (r2.body as { data: { scanned: number } }).data;
    expect(a.scanned).toBe(b.scanned);
  });

  test("set-subscription-expiry rejects missing args", async () => {
    const api = await newApi();
    const r = await apiSend(api, "POST", "/api/dev/set-subscription-expiry", {});
    expect(r.status).toBe(400);
  });

  test("seed-user upserts and returns the row", async () => {
    const api = await newApi();
    const id = `user_e2e_seed_${Date.now()}`;
    const r = await apiSend(api, "POST", "/api/dev/seed-user", {
      id,
      email: `${id}@example.com`,
      username: id.toLowerCase(),
    });
    expect(r.status).toBe(200);
    expect((r.body as { data: { id: string } }).data.id).toBe(id);
  });

  test("seed-review inserts a row (Phase 4C)", async () => {
    const api = await newApi();
    const reviewerId = `user_e2e_reviewer_${Date.now()}`;
    const targetId = `user_e2e_target_${Date.now()}`;
    await apiSend(api, "POST", "/api/dev/seed-user", { id: reviewerId, status: "active" });
    await apiSend(api, "POST", "/api/dev/seed-user", { id: targetId, status: "active" });
    const r = await apiSend(api, "POST", "/api/dev/seed-review", {
      reviewerId,
      targetUserId: targetId,
      rating: 4,
      status: "live",
    });
    expect(r.status).toBe(200);
    const data = (r.body as { data: { id: string; rating: number; status: string } }).data;
    expect(data.rating).toBe(4);
    expect(data.status).toBe("live");
  });

  test("profile reviews list reflects seeded data", async () => {
    const api = await newApi();
    const ts = Date.now();
    const reviewerId = `user_e2e_r2_${ts}`;
    const targetId = `user_e2e_t2_${ts}`;
    await apiSend(api, "POST", "/api/dev/seed-user", { id: reviewerId, status: "active" });
    await apiSend(api, "POST", "/api/dev/seed-user", { id: targetId, status: "active" });
    await apiSend(api, "POST", "/api/dev/seed-review", {
      reviewerId,
      targetUserId: targetId,
      rating: 5,
      comment: "e2e seed",
      status: "live",
    });
    const r = await apiGet(api, `/api/profiles/${encodeURIComponent(targetId)}/reviews`);
    expect(r.status).toBe(200);
    const body = r.body as { data: { reviews: Array<{ rating: number }>; aggregate: { count: number } } };
    const ratings = body.data.reviews.map((x) => x.rating);
    expect(ratings).toContain(5);
    expect(body.data.aggregate.count).toBeGreaterThan(0);
  });
});
