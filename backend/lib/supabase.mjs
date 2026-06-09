import { env } from "./env.mjs";

function assertConfigured() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase env vars missing (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  }
}

async function request(path, init = {}) {
  assertConfigured();
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase ${init.method ?? "GET"} ${path} failed: ${response.status} ${text}`);
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export async function selectOne(table, query) {
  const rows = await request(`${table}?${query}&limit=1`);
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

export async function selectMany(table, query) {
  const rows = await request(`${table}?${query}`);
  return Array.isArray(rows) ? rows : [];
}

export async function insertRow(table, row, { returning = "minimal" } = {}) {
  const prefer = returning === "representation"
    ? "return=representation"
    : "return=minimal";
  const result = await request(table, {
    method: "POST",
    headers: { prefer },
    body: JSON.stringify(row),
  });
  return Array.isArray(result) ? result[0] : result;
}

export async function upsertRow(table, row, conflictColumns, { returning = "minimal" } = {}) {
  const prefer = `resolution=merge-duplicates,${returning === "representation" ? "return=representation" : "return=minimal"}`;
  const result = await request(`${table}?on_conflict=${encodeURIComponent(conflictColumns)}`, {
    method: "POST",
    headers: { prefer },
    body: JSON.stringify(row),
  });
  return Array.isArray(result) ? result[0] : result;
}

export async function updateRows(table, filter, patch) {
  return request(`${table}?${filter}`, {
    method: "PATCH",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
}

export const supabase = { selectOne, selectMany, insertRow, upsertRow, updateRows };
