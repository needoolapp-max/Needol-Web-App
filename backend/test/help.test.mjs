// PRD §14 — Help & Guide CMS pure-logic coverage.
import assert from "node:assert/strict";
import test from "node:test";
import {
  ARTICLE_STATUSES,
  HelpError,
  MAX_SLUG,
  MAX_TITLE,
  deriveExcerpt,
  isVisibleToVisitor,
  pickArticleInput,
  slugify,
  validateArticle,
} from "../lib/help.mjs";

test("constants match PRD §14", () => {
  assert.deepEqual(ARTICLE_STATUSES, ["draft", "published", "archived"]);
  assert.equal(MAX_SLUG, 100);
  assert.equal(MAX_TITLE, 200);
});

test("slugify lowercases + replaces spaces", () => {
  assert.equal(slugify("Getting Started"), "getting-started");
});

test("slugify collapses runs and trims hyphens", () => {
  assert.equal(slugify("  --A!--cool  --Title-- "), "a-cool-title");
});

test("slugify strips diacritics", () => {
  assert.equal(slugify("Café Résumé"), "cafe-resume");
});

test("slugify empty input → empty string", () => {
  assert.equal(slugify(""), "");
  assert.equal(slugify(null), "");
});

test("slugify caps at MAX_SLUG", () => {
  const long = "x".repeat(MAX_SLUG + 20);
  assert.equal(slugify(long).length, MAX_SLUG);
});

test("pickArticleInput — derives slug from title when not given", () => {
  const out = pickArticleInput({ title: "Welcome to Needool", body: "Hello." });
  assert.equal(out.slug, "welcome-to-needool");
});

test("pickArticleInput — explicit slug wins + is slugified", () => {
  const out = pickArticleInput({
    title: "Welcome to Needool",
    body: "Hello.",
    slug: "Custom Slug!",
  });
  assert.equal(out.slug, "custom-slug");
});

test("pickArticleInput — trims title, body left raw", () => {
  const body = "# Hi\n\n*bold* text.";
  const out = pickArticleInput({ title: "  Hi  ", body });
  assert.equal(out.title, "Hi");
  assert.equal(out.body, body);
});

test("pickArticleInput — tags filtered to non-empty strings + 12-cap + 40-char-cap", () => {
  const out = pickArticleInput({
    title: "T", body: "B",
    tags: ["alpha", " beta ", "", null, "x".repeat(60), ...Array(20).fill("dup")],
  });
  assert.equal(out.tags.length, 12);
  assert.equal(out.tags.includes("alpha"), true);
  assert.equal(out.tags.includes("beta"), true);
  // Each tag capped at 40 chars
  for (const t of out.tags) assert.ok(t.length <= 40);
});

test("pickArticleInput — invalid status ignored", () => {
  const out = pickArticleInput({ title: "T", body: "B", status: "bananas" });
  assert.equal(out.status, undefined);
});

test("pickArticleInput — published status accepted", () => {
  const out = pickArticleInput({ title: "T", body: "B", status: "published" });
  assert.equal(out.status, "published");
});

test("validateArticle — missing title throws 400", () => {
  assert.throws(
    () => validateArticle({ body: "B", slug: "s" }),
    (e) => e instanceof HelpError && e.field === "title",
  );
});

test("validateArticle — missing body throws 400", () => {
  assert.throws(
    () => validateArticle({ title: "T", slug: "s" }),
    (e) => e instanceof HelpError && e.field === "body",
  );
});

test("validateArticle — missing slug throws 400", () => {
  assert.throws(
    () => validateArticle({ title: "T", body: "B" }),
    (e) => e instanceof HelpError && e.field === "slug",
  );
});

test("validateArticle — happy path passes", () => {
  assert.doesNotThrow(() => validateArticle({ title: "T", body: "B", slug: "t" }));
});

test("isVisibleToVisitor — only published rows", () => {
  assert.equal(isVisibleToVisitor({ status: "published" }), true);
  assert.equal(isVisibleToVisitor({ status: "draft" }), false);
  assert.equal(isVisibleToVisitor({ status: "archived" }), false);
  assert.equal(isVisibleToVisitor(null), false);
});

test("deriveExcerpt — strips markdown emphasis and trims length", () => {
  const body = "# Heading\n\n*bold* and _italic_ text with `code`.";
  const out = deriveExcerpt(body);
  assert.ok(!out.includes("#"));
  assert.ok(!out.includes("*"));
  assert.ok(!out.includes("_"));
});

test("deriveExcerpt — truncates with ellipsis past 240 chars", () => {
  const body = "x".repeat(500);
  const out = deriveExcerpt(body);
  assert.equal(out.length, 238); // 237 chars + ellipsis
  assert.ok(out.endsWith("…"));
});

test("HelpError preserves status + field", () => {
  const e = new HelpError(409, "slug taken", "slug");
  assert.equal(e.status, 409);
  assert.equal(e.field, "slug");
});
