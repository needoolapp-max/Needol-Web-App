// PRD §4 — Search and discovery pure logic. IO lives in search-store.mjs.

export const SCOPES = ["worldwide", "country", "state", "city", "near"];
export const NEAR_RADII_KM = [1, 5, 15, 50];
export const SEARCH_PAGE_SIZE = 20;
export const INACTIVE_PAGE_1_THRESHOLD = 20; // PRD §4.2

export class SearchError extends Error {
  constructor(status, message, field) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

// Pure great-circle distance.
export function haversineKm(a, b) {
  if (!a || !b || !Number.isFinite(a.lat) || !Number.isFinite(a.lng)
      || !Number.isFinite(b.lat) || !Number.isFinite(b.lng)) return null;
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// PRD §4.2 — Active above Inactive, then relevance (desc), then distance
// (asc), then updated_at (desc). Returns a number suitable for Array.sort.
export function compareCandidates(a, b) {
  // Active first.
  const aActive = a.status === "active" ? 0 : 1;
  const bActive = b.status === "active" ? 0 : 1;
  if (aActive !== bActive) return aActive - bActive;
  // Relevance desc.
  if ((b.relevance || 0) !== (a.relevance || 0)) return (b.relevance || 0) - (a.relevance || 0);
  // Distance asc (null = farther).
  const aDist = a.distanceKm == null ? Number.POSITIVE_INFINITY : a.distanceKm;
  const bDist = b.distanceKm == null ? Number.POSITIVE_INFINITY : b.distanceKm;
  if (aDist !== bDist) return aDist - bDist;
  // Recency desc.
  const aT = new Date(a.updated_at || 0).getTime();
  const bT = new Date(b.updated_at || 0).getTime();
  return bT - aT;
}

// PRD §4.2 — Inactive shows on page 1 only when fewer than 20 Active matches
// exist. Returns the slice for the requested page.
export function paginate(sorted, page = 1, pageSize = SEARCH_PAGE_SIZE) {
  const activeRows = sorted.filter((r) => r.status === "active");
  const inactiveRows = sorted.filter((r) => r.status !== "active");
  const ordered = activeRows.length >= INACTIVE_PAGE_1_THRESHOLD
    ? [...activeRows, ...inactiveRows]
    : sorted;
  const start = (page - 1) * pageSize;
  return ordered.slice(start, start + pageSize);
}

// Validates + normalizes the public query string. Throws SearchError on bad
// scope / near-without-coords / unknown radius.
export function pickSearchInput(query, params) {
  const q = (query || "").toString().trim().slice(0, 200);
  const scope = (params.scope || "worldwide").toString().toLowerCase();
  if (!SCOPES.includes(scope)) {
    throw new SearchError(400, `Invalid scope. Must be one of: ${SCOPES.join(", ")}.`, "scope");
  }
  const out = { q, scope };
  if (scope !== "worldwide") {
    if (params.country) out.country = String(params.country).trim();
  }
  if (scope === "state" || scope === "city") {
    if (params.state) out.state = String(params.state).trim();
  }
  if (scope === "city") {
    if (params.city) out.city = String(params.city).trim();
  }
  if (scope === "near") {
    const lat = Number(params.lat);
    const lng = Number(params.lng);
    const radiusKm = Number(params.radius);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new SearchError(400, "Near-me scope requires lat + lng query params.", "lat");
    }
    if (!NEAR_RADII_KM.includes(radiusKm)) {
      throw new SearchError(
        400,
        `Near-me radius must be one of ${NEAR_RADII_KM.join(", ")} km.`,
        "radius",
      );
    }
    out.lat = lat;
    out.lng = lng;
    out.radiusKm = radiusKm;
  }
  const page = Math.max(1, Math.min(50, Number(params.page) || 1));
  out.page = page;
  return out;
}
