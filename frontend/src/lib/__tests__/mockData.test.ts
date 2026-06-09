import { describe, expect, it } from "vitest";
import {
  getProvider,
  getProviderReviews,
  providers,
  reviews,
} from "@/lib/mockData";

describe("mockData", () => {
  it("exposes provider seed data", () => {
    expect(providers.length).toBeGreaterThan(0);
    for (const p of providers) {
      expect(p.id).toBeTruthy();
      expect(p.username).toBeTruthy();
      expect(["active", "inactive"]).toContain(p.status);
    }
  });

  it("getProvider returns the matching record or undefined", () => {
    const first = providers[0];
    expect(getProvider(first.username)?.id).toBe(first.id);
    expect(getProvider("not-a-real-user")).toBeUndefined();
  });

  it("reviews seed exposes a non-empty array with provider IDs that exist", () => {
    expect(reviews.length).toBeGreaterThan(0);
    const providerIds = new Set(providers.map((p) => p.id));
    for (const r of reviews) {
      expect(providerIds.has(r.providerId)).toBe(true);
      expect(r.rating).toBeGreaterThanOrEqual(1);
      expect(r.rating).toBeLessThanOrEqual(5);
    }
  });

  it("getProviderReviews returns only that provider's reviews", () => {
    const first = providers[0];
    const list = getProviderReviews(first.id);
    for (const r of list) {
      expect(r.providerId).toBe(first.id);
    }
  });
});
