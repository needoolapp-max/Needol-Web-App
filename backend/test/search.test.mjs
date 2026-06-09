// PRD §4 — search pure-logic coverage.
import assert from "node:assert/strict";
import test from "node:test";
import {
  INACTIVE_PAGE_1_THRESHOLD,
  NEAR_RADII_KM,
  SCOPES,
  SEARCH_PAGE_SIZE,
  SearchError,
  compareCandidates,
  haversineKm,
  paginate,
  pickSearchInput,
} from "../lib/search.mjs";

test("constants match PRD §4 (scopes, radii, page size, inactive threshold)", () => {
  assert.deepEqual(SCOPES, ["worldwide", "country", "state", "city", "near"]);
  assert.deepEqual(NEAR_RADII_KM, [1, 5, 15, 50]);
  assert.equal(SEARCH_PAGE_SIZE, 20);
  assert.equal(INACTIVE_PAGE_1_THRESHOLD, 20);
});

test("haversineKm — Lagos to Abuja is ~530 km", () => {
  const d = haversineKm({ lat: 6.5244, lng: 3.3792 }, { lat: 9.0579, lng: 7.4951 });
  // Rough check — accept anywhere in 520-545 km.
  assert.ok(d > 520 && d < 545, `expected ~530, got ${d}`);
});

test("haversineKm — invalid input returns null", () => {
  assert.equal(haversineKm(null, { lat: 0, lng: 0 }), null);
  assert.equal(haversineKm({ lat: 0, lng: 0 }, { lat: NaN, lng: 0 }), null);
});

test("compareCandidates — Active always above Inactive", () => {
  const a = { status: "active", relevance: 0, updated_at: "2024-01-01" };
  const b = { status: "inactive", relevance: 99, updated_at: "2026-01-01" };
  // Despite higher relevance + recency, b is Inactive so it loses.
  assert.ok(compareCandidates(a, b) < 0);
});

test("compareCandidates — within tier, higher relevance wins", () => {
  const a = { status: "active", relevance: 3, distanceKm: 10, updated_at: "2020-01-01" };
  const b = { status: "active", relevance: 1, distanceKm: 0, updated_at: "2026-01-01" };
  assert.ok(compareCandidates(a, b) < 0);
});

test("compareCandidates — same relevance, closer wins", () => {
  const a = { status: "active", relevance: 1, distanceKm: 5, updated_at: "2020-01-01" };
  const b = { status: "active", relevance: 1, distanceKm: 50, updated_at: "2026-01-01" };
  assert.ok(compareCandidates(a, b) < 0);
});

test("compareCandidates — null distance treated as farthest", () => {
  const a = { status: "active", relevance: 1, distanceKm: 5, updated_at: "2020-01-01" };
  const b = { status: "active", relevance: 1, distanceKm: null, updated_at: "2026-01-01" };
  assert.ok(compareCandidates(a, b) < 0);
});

test("compareCandidates — same everything else, recency wins", () => {
  const a = { status: "active", relevance: 1, distanceKm: 5, updated_at: "2026-01-01" };
  const b = { status: "active", relevance: 1, distanceKm: 5, updated_at: "2020-01-01" };
  assert.ok(compareCandidates(a, b) < 0);
});

test("paginate — Inactive on page 1 only when fewer than 20 Active", () => {
  const active = Array.from({ length: 5 }, (_, i) => ({ id: `a${i}`, status: "active" }));
  const inactive = Array.from({ length: 3 }, (_, i) => ({ id: `i${i}`, status: "inactive" }));
  const sorted = [...active, ...inactive];
  const page1 = paginate(sorted, 1, 20);
  // Fewer than 20 Active → page 1 includes Inactive.
  assert.equal(page1.length, 8);
  const hasInactive = page1.some((r) => r.status === "inactive");
  assert.equal(hasInactive, true);
});

test("paginate — Active >= 20 hides Inactive from page 1", () => {
  const active = Array.from({ length: 25 }, (_, i) => ({ id: `a${i}`, status: "active" }));
  const inactive = Array.from({ length: 5 }, (_, i) => ({ id: `i${i}`, status: "inactive" }));
  const page1 = paginate([...active, ...inactive], 1, 20);
  assert.equal(page1.length, 20);
  for (const r of page1) assert.equal(r.status, "active");
});

test("paginate — page 2 honors page size", () => {
  const active = Array.from({ length: 25 }, (_, i) => ({ id: `a${i}`, status: "active" }));
  const inactive = Array.from({ length: 5 }, (_, i) => ({ id: `i${i}`, status: "inactive" }));
  const page2 = paginate([...active, ...inactive], 2, 20);
  // 25 active - 20 on page 1 = 5 active on page 2 + 5 inactive = 10 total
  assert.equal(page2.length, 10);
});

test("pickSearchInput — default scope is worldwide", () => {
  const r = pickSearchInput("react", {});
  assert.equal(r.scope, "worldwide");
});

test("pickSearchInput — invalid scope rejected", () => {
  assert.throws(
    () => pickSearchInput("react", { scope: "galaxy" }),
    (e) => e instanceof SearchError && e.field === "scope",
  );
});

test("pickSearchInput — near without coords rejected", () => {
  assert.throws(
    () => pickSearchInput("react", { scope: "near" }),
    (e) => e instanceof SearchError && e.field === "lat",
  );
});

test("pickSearchInput — invalid near radius rejected", () => {
  assert.throws(
    () => pickSearchInput("react", { scope: "near", lat: 1, lng: 1, radius: 100 }),
    (e) => e instanceof SearchError && e.field === "radius",
  );
});

test("pickSearchInput — happy path near with radius 15", () => {
  const r = pickSearchInput("plumber", { scope: "near", lat: 6.52, lng: 3.38, radius: 15 });
  assert.equal(r.radiusKm, 15);
  assert.equal(r.scope, "near");
});

test("pickSearchInput — query trimmed and capped at 200 chars", () => {
  const r = pickSearchInput("  " + "x".repeat(500) + "  ", {});
  assert.equal(r.q.length, 200);
});

test("pickSearchInput — page param clamped to [1, 50]", () => {
  assert.equal(pickSearchInput("", { page: 0 }).page, 1);
  assert.equal(pickSearchInput("", { page: 999 }).page, 50);
});

test("SearchError preserves status + field", () => {
  const e = new SearchError(400, "msg", "scope");
  assert.equal(e.status, 400);
  assert.equal(e.field, "scope");
});
