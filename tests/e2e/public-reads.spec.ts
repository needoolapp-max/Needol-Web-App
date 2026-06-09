import { expect, test } from "@playwright/test";
import { apiGet, newApi } from "./helpers";

test.describe("public API reads", () => {
  test("backend health responds 200 with service descriptor", async () => {
    const api = await newApi();
    const r = await apiGet(api, "/health");
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, service: "needool-backend" });
  });

  test("posts feed surfaces engagement counts", async () => {
    const api = await newApi();
    const r = await apiGet(api, "/api/posts?kind=need");
    expect(r.status).toBe(200);
    const data = (r.body as { data: Array<{ likeCount: number; saveCount: number; commentCount: number }> }).data;
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      const p = data[0];
      expect(typeof p.likeCount).toBe("number");
      expect(typeof p.saveCount).toBe("number");
      expect(typeof p.commentCount).toBe("number");
    }
  });

  test("kind-specific feeds match base posts route", async () => {
    const api = await newApi();
    const fromAlias = await apiGet(api, "/api/needs");
    const fromBase = await apiGet(api, "/api/posts?kind=need");
    expect(fromAlias.status).toBe(200);
    expect(fromBase.status).toBe(200);
    expect((fromAlias.body as { data: unknown[] }).data.length).toBe((fromBase.body as { data: unknown[] }).data.length);
  });

  test("jobs feed returns 200 and well-formed shape", async () => {
    const api = await newApi();
    const r = await apiGet(api, "/api/jobs");
    expect(r.status).toBe(200);
    const data = (r.body as { data: unknown[] }).data;
    expect(Array.isArray(data)).toBe(true);
  });

  test("static GET fallbacks return data shape", async () => {
    const api = await newApi();
    const r = await apiGet(api, "/api/providers");
    expect(r.status).toBe(200);
    expect((r.body as { data: unknown[] }).data.length).toBeGreaterThan(0);
  });

  test("unknown route returns 404 JSON", async () => {
    const api = await newApi();
    const r = await apiGet(api, "/api/this-route-does-not-exist");
    expect(r.status).toBe(404);
  });

  test("CORS headers expose allowed methods including DELETE", async () => {
    const r = await fetch("http://localhost:4100/api/posts?kind=need");
    expect(r.headers.get("access-control-allow-methods")?.toUpperCase()).toContain("DELETE");
  });
});
