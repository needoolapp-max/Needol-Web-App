// Phase 5 — seed planner unit tests. Pure helpers only; the IO functions
// (seedLagosProviders / seedNeedRequests / seedHelpArticles) hit Supabase
// and are covered by the Playwright e2e gate.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  helpArticlePlan,
  lagosProviderPlan,
  needRequestPlan,
} from "../lib/seed-data.mjs";

test("lagosProviderPlan returns the requested count with stable ids", () => {
  const plan = lagosProviderPlan(50);
  assert.equal(plan.length, 50);
  // Stable ids across runs.
  assert.equal(plan[0].id, "seed_lagos_001");
  assert.equal(plan[49].id, "seed_lagos_050");
  // Stable usernames.
  const usernames = plan.map((p) => p.username);
  assert.equal(usernames.length, new Set(usernames).size, "usernames must be unique");
  // Stable mix of account types — every 5th is Business per the rotation.
  const businessShare = plan.filter((p) => p.accountType === "Business").length;
  assert.equal(businessShare, 10);
});

test("lagosProviderPlan respects the count argument", () => {
  assert.equal(lagosProviderPlan(10).length, 10);
  assert.equal(lagosProviderPlan(1).length, 1);
});

test("each lagos provider has two skills with allowed kinds", () => {
  const plan = lagosProviderPlan(50);
  for (const p of plan) {
    assert.equal(p.skills.length, 2);
    for (const s of p.skills) {
      assert.ok(["skill", "product", "service"].includes(s.kind), `bad kind: ${s.kind}`);
      assert.ok(s.label && s.label.length > 0);
      assert.ok(s.label.length <= 50);
    }
  }
});

test("every lagos provider carries Lagos location fields", () => {
  const plan = lagosProviderPlan(50);
  for (const p of plan) {
    assert.equal(p.area && typeof p.area, "string");
    assert.ok(p.bio && p.bio.length > 0);
    assert.match(p.email, /@/);
  }
});

test("needRequestPlan returns the requested count with seed authors", () => {
  const plan = needRequestPlan(30);
  assert.equal(plan.length, 30);
  for (const n of plan) {
    assert.match(n.authorId, /^seed_lagos_/);
    assert.equal(n.status, "approved");
    assert.equal(n.kind, "need");
    assert.equal(n.scope, "city");
    assert.equal(n.scopeCountry, "Nigeria");
    assert.equal(n.scopeState, "Lagos");
    assert.ok(n.title.length > 0);
    assert.ok(n.description.length > 0);
  }
});

test("helpArticlePlan returns 10 published-ready entries with unique slugs", () => {
  const plan = helpArticlePlan();
  assert.equal(plan.length, 10);
  const slugs = plan.map((p) => p.slug);
  assert.equal(slugs.length, new Set(slugs).size, "slugs must be unique");
  for (const a of plan) {
    assert.ok(a.title.length > 0);
    assert.ok(a.body.length > 50, `article ${a.slug} body too short`);
    assert.ok(a.category && a.category.length > 0);
    assert.ok(Array.isArray(a.tags));
  }
});
