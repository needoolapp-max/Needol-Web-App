import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, API_BASE_URL } from "@/lib/api";

describe("ApiError", () => {
  it("preserves status, message, and optional code", () => {
    const e = new ApiError(429, "Too many", "RATE_LIMIT");
    expect(e.status).toBe(429);
    expect(e.message).toBe("Too many");
    expect(e.code).toBe("RATE_LIMIT");
    expect(e instanceof Error).toBe(true);
  });
});

describe("apiFetch", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        if (String(url).endsWith("/api/ok")) {
          return new Response(JSON.stringify({ data: { x: 1 } }), { status: 200 });
        }
        if (String(url).endsWith("/api/err")) {
          return new Response(JSON.stringify({ error: "Bad input", code: "BAD" }), { status: 400 });
        }
        if (String(url).endsWith("/api/text")) {
          return new Response("plain", { status: 200 });
        }
        if (String(url).endsWith("/api/auth")) {
          const auth = (init.headers as Record<string, string>).Authorization;
          return new Response(JSON.stringify({ data: auth }), { status: 200 });
        }
        return new Response("{}", { status: 200 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns parsed JSON on success", async () => {
    const r = await apiFetch<{ data: { x: number } }>("/api/ok");
    expect(r.data.x).toBe(1);
  });

  it("throws ApiError carrying status, message, and code on 4xx", async () => {
    await expect(apiFetch("/api/err")).rejects.toMatchObject({
      name: "Error",
      status: 400,
      message: "Bad input",
      code: "BAD",
    });
  });

  it("falls back to raw text when response is not JSON", async () => {
    const r = await apiFetch<string>("/api/text");
    expect(r).toBe("plain");
  });

  it("attaches Authorization header when getToken is provided", async () => {
    const r = await apiFetch<{ data: string }>("/api/auth", {
      getToken: async () => "tok-abc",
    });
    expect(r.data).toBe("Bearer tok-abc");
  });

  it("hits API_BASE_URL", async () => {
    await apiFetch("/api/ok");
    const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(String(calls[0][0])).toBe(`${API_BASE_URL}/api/ok`);
  });
});
