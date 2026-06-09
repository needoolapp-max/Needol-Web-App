// PRD §4 — search IO. Combines user text matches + skill matches into a
// ranked, paginated result set. Visitor-safe (only public-summary fields
// leave the layer — per PRD §4.3 the response strips contact info).
import { selectMany } from "./supabase.mjs";
import { env } from "./env.mjs";
import {
  compareCandidates,
  haversineKm,
  paginate,
  SEARCH_PAGE_SIZE,
  SearchError,
} from "./search.mjs";
import { publicUrl } from "./storage.mjs";

// Build a PostgREST `or=` expression that matches across name, username,
// bio, and cv_extracted_text. We use ILIKE so trigram GIN indexes can help.
function buildTextOr(q) {
  const escaped = q.replace(/[(),]/g, " ").replace(/\s+/g, " ").trim();
  if (!escaped) return null;
  const like = `*${escaped}*`;
  return [
    `name.ilike.${like}`,
    `username.ilike.${like}`,
    `bio.ilike.${like}`,
    `cv_extracted_text.ilike.${like}`,
  ].join(",");
}

async function fetchTextMatches({ q, scope, country, state, city, limit = 200 }) {
  const params = new URLSearchParams();
  // PRD §4.3 visitors can search — keep visible fields in select.
  params.set("select", "id,username,name,avatar,status,account_type,bio,country,state,city,location_lat,location_lng,profile_picture_path,updated_at,active_since");
  // Deleted users are filtered out via the deleted_at column added in §15.4
  // — Supabase will return rows even when deleted_at is set unless we
  // explicitly filter. Best-effort: skip deleted_at columns if absent.
  params.set("deleted_at", "is.null");
  if (scope === "country" && country) params.set("country", `eq.${country}`);
  if (scope === "state" && country) params.set("country", `eq.${country}`);
  if (scope === "state" && state) params.set("state", `eq.${state}`);
  if (scope === "city" && country) params.set("country", `eq.${country}`);
  if (scope === "city" && state) params.set("state", `eq.${state}`);
  if (scope === "city" && city) params.set("city", `eq.${city}`);
  if (q) {
    const or = buildTextOr(q);
    if (or) params.set("or", `(${or})`);
  }
  params.set("limit", String(limit));
  return selectMany("users", params.toString());
}

// PRD §4.1 — skills/products/services are first-class searchable fields.
// Returns the user_ids that have a label matching the query.
async function fetchSkillMatchedUserIds(q, { limit = 500 } = {}) {
  if (!q) return new Set();
  const escaped = q.replace(/[(),]/g, " ").replace(/\s+/g, " ").trim();
  if (!escaped) return new Set();
  const like = `*${escaped}*`;
  const rows = await selectMany(
    "user_skills",
    `label=ilike.${encodeURIComponent(like)}&select=user_id&limit=${limit}`,
  );
  return new Set(rows.map((r) => r.user_id));
}

// Compute a coarse relevance score 0-3 to break ties before geo/recency.
// Exact-username = 3, exact-name = 2, skill-match = 2, bio/CV match = 1.
function relevanceScore(row, q, skillIds) {
  if (!q) return 0;
  const needle = q.toLowerCase();
  let score = 0;
  if (row.username?.toLowerCase() === needle) score = Math.max(score, 3);
  if (row.name?.toLowerCase() === needle) score = Math.max(score, 2);
  if (row.name?.toLowerCase().includes(needle)) score = Math.max(score, 1);
  if (row.username?.toLowerCase().includes(needle)) score = Math.max(score, 2);
  if (skillIds.has(row.id)) score = Math.max(score, 2);
  if (row.bio?.toLowerCase().includes(needle)) score = Math.max(score, 1);
  if (row.cv_extracted_text?.toLowerCase().includes(needle)) score = Math.max(score, 1);
  return score;
}

// PRD §4.3 — visitor-safe shape. No phone/whatsapp/links/CV leakage.
function publicSearchShape(row, { distanceKm = null, relevance = 0 } = {}) {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    avatar: row.profile_picture_path
      ? publicUrl({ bucket: "avatars", path: row.profile_picture_path })
      : row.avatar,
    accountType: row.account_type,
    status: row.status,
    bio: row.bio ?? null,
    country: row.country ?? null,
    state: row.state ?? null,
    city: row.city ?? null,
    distanceKm: distanceKm != null ? Math.round(distanceKm * 10) / 10 : null,
    relevance,
    updated_at: row.updated_at,
  };
}

// Main entry — runs the §4.1/§4.2/§4.3 query plan.
export async function searchUsers(params, { now = new Date() } = {}) {
  // Hydrate matches: text-side + skill-side, then merge by id.
  const [textRows, skillIds] = await Promise.all([
    fetchTextMatches({
      q: params.q,
      scope: params.scope,
      country: params.country,
      state: params.state,
      city: params.city,
      limit: 300,
    }),
    fetchSkillMatchedUserIds(params.q),
  ]);

  // If skill match yielded users not in the text rows (e.g. their bio
  // didn't match), pull them separately.
  const knownIds = new Set(textRows.map((r) => r.id));
  const missingSkillIds = [...skillIds].filter((id) => !knownIds.has(id));
  let extras = [];
  if (missingSkillIds.length > 0) {
    const ids = missingSkillIds.slice(0, 200);
    extras = await selectMany(
      "users",
      `id=in.(${ids.map(encodeURIComponent).join(",")})&select=id,username,name,avatar,status,account_type,bio,country,state,city,location_lat,location_lng,profile_picture_path,updated_at,active_since&deleted_at=is.null`,
    );
  }
  const merged = [...textRows, ...extras];

  // Apply scope filter for skill-only matches that bypassed the text OR.
  const filtered = merged.filter((row) => {
    if (params.scope === "country" && params.country && row.country !== params.country) return false;
    if (params.scope === "state" && params.state && row.state !== params.state) return false;
    if (params.scope === "city" && params.city && row.city !== params.city) return false;
    return true;
  });

  // Score + distance + near-me radius cull.
  const scored = filtered.map((row) => {
    const distanceKm = (params.scope === "near" || (params.lat != null && params.lng != null))
      ? haversineKm(
          { lat: Number(row.location_lat), lng: Number(row.location_lng) },
          { lat: params.lat, lng: params.lng },
        )
      : null;
    return {
      ...row,
      distanceKm,
      relevance: relevanceScore(row, params.q, skillIds),
    };
  });

  const culled = params.scope === "near"
    ? scored.filter((r) => r.distanceKm != null && r.distanceKm <= params.radiusKm)
    : scored;

  // Sort + paginate per PRD §4.2.
  culled.sort(compareCandidates);
  const page = paginate(culled, params.page || 1, SEARCH_PAGE_SIZE);

  return {
    total: culled.length,
    page: params.page || 1,
    pageSize: SEARCH_PAGE_SIZE,
    results: page.map((row) =>
      publicSearchShape(row, { distanceKm: row.distanceKm, relevance: row.relevance }),
    ),
  };
}
