// Supabase Storage REST wrappers — service-role only. No new env vars beyond
// the existing SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
import { env } from "./env.mjs";
import { MAX_FILE_BYTES, ProfileError } from "./profile.mjs";

const STORAGE = () => `${env.SUPABASE_URL}/storage/v1`;

function authHeaders(extra = {}) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    ...extra,
  };
}

export async function uploadObject({ bucket, path, body, contentType, upsert = true }) {
  if (!body) throw new ProfileError(400, "Empty file.", "file");
  if (body.byteLength > MAX_FILE_BYTES) {
    throw new ProfileError(400, `File exceeds 5 MB cap.`, "file");
  }
  const r = await fetch(`${STORAGE()}/object/${encodeURIComponent(bucket)}/${path}`, {
    method: "POST",
    headers: authHeaders({
      "content-type": contentType || "application/octet-stream",
      "x-upsert": upsert ? "true" : "false",
    }),
    body,
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Storage upload ${bucket}/${path} failed: ${r.status} ${text}`);
  }
  return { bucket, path };
}

export async function deleteObject({ bucket, path }) {
  if (!path) return;
  const r = await fetch(`${STORAGE()}/object/${encodeURIComponent(bucket)}/${path}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  // 404 is fine — already gone.
  if (!r.ok && r.status !== 404) {
    const text = await r.text();
    throw new Error(`Storage delete ${bucket}/${path} failed: ${r.status} ${text}`);
  }
}

export function publicUrl({ bucket, path }) {
  if (!path) return null;
  return `${STORAGE()}/object/public/${encodeURIComponent(bucket)}/${path}`;
}

// PRD §3.1 — server-side text extraction; result lands in users.cv_extracted_text
// and is later indexed for §4 search.
export async function extractPdfText(buffer) {
  try {
    const mod = await import("pdf-parse/lib/pdf-parse.js");
    const pdfParse = mod.default || mod;
    const data = await pdfParse(buffer);
    return (data?.text || "").trim();
  } catch (e) {
    console.warn(`[storage] pdf text extraction failed: ${e.message}`);
    return "";
  }
}
