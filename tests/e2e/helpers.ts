import { request, APIRequestContext } from "@playwright/test";

export const API_BASE = process.env.NEEDOOL_API_BASE || "http://localhost:4100";

// Most public reads are unauthenticated; mutations require Clerk bearer tokens
// which the test harness does not have. The e2e suite focuses on:
//   - public reads (200)
//   - unauthenticated mutation gates (401)
//   - dev-only endpoints that backend mounts under NODE_ENV=development
export async function apiGet(api: APIRequestContext, path: string): Promise<{ status: number; body: unknown }> {
  const r = await api.get(`${API_BASE}${path}`);
  let body: unknown = null;
  try { body = await r.json(); } catch { body = await r.text(); }
  return { status: r.status(), body };
}

export async function apiSend(
  api: APIRequestContext,
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<{ status: number; body: unknown }> {
  const opts: Parameters<typeof api.post>[1] = body !== undefined
    ? { data: body, headers: { "Content-Type": "application/json" } }
    : { headers: { "Content-Type": "application/json" } };
  let r;
  if (method === "POST") r = await api.post(`${API_BASE}${path}`, opts);
  else if (method === "PATCH") r = await api.patch(`${API_BASE}${path}`, opts);
  else r = await api.delete(`${API_BASE}${path}`, opts);
  let parsed: unknown = null;
  try { parsed = await r.json(); } catch { parsed = await r.text(); }
  return { status: r.status(), body: parsed };
}

export async function newApi(): Promise<APIRequestContext> {
  return request.newContext({ extraHTTPHeaders: { "Content-Type": "application/json" } });
}
