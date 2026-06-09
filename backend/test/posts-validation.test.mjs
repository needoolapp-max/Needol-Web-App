// Phase 4D-7 — PRD §5.1, §5.5, §6.1 post-validation coverage.
import assert from "node:assert/strict";
import test from "node:test";
import { containsContactInfo, stripContactInfo } from "../lib/posts.mjs";

test("containsContactInfo — clean text returns false", () => {
  assert.equal(containsContactInfo("Need a React dev for 2 weeks"), false);
});

test("containsContactInfo — phone number detected", () => {
  assert.equal(containsContactInfo("Call 0801 234 5678 today"), true);
  assert.equal(containsContactInfo("DM me at +234-701-234-5678"), true);
});

test("containsContactInfo — email detected", () => {
  assert.equal(containsContactInfo("Email me at hr@example.com"), true);
});

test("containsContactInfo — ISO date 2026-05-31 NOT flagged as phone", () => {
  assert.equal(containsContactInfo("Available 2026-05-31"), false);
});

test("containsContactInfo — URL only flagged when checkUrls=true", () => {
  assert.equal(containsContactInfo("Visit https://example.com"), false);
  assert.equal(containsContactInfo("Visit https://example.com", { checkUrls: true }), true);
  assert.equal(containsContactInfo("Visit www.example.com", { checkUrls: true }), true);
});

test("containsContactInfo — null/empty safe", () => {
  assert.equal(containsContactInfo(null), false);
  assert.equal(containsContactInfo(""), false);
});

test("stripContactInfo — legacy strip path unchanged (back-compat)", () => {
  assert.equal(
    stripContactInfo("Call 0801 234 5678 or email hr@example.com"),
    "Call [contact removed] or email [contact removed]",
  );
});

test("containsContactInfo — pure-digit timestamps NOT flagged as phone", () => {
  // 13-digit Date.now() value used in test fixtures.
  assert.equal(containsContactInfo("Clean Title 1780302879127"), false);
  assert.equal(containsContactInfo("Build #1780302879127 dropped"), false);
});

test("containsContactInfo — separated phone formats flagged", () => {
  assert.equal(containsContactInfo("Call 0801 234 5678 today"), true);
  assert.equal(containsContactInfo("Call 0801-234-5678 today"), true);
  assert.equal(containsContactInfo("(801) 234-5678 anytime"), true);
});

test("containsContactInfo — international + prefix flagged", () => {
  assert.equal(containsContactInfo("Try +2347012345678"), true);
});

test("PRD §5.1 reject-vs-strip semantics — both helpers coexist", () => {
  // The legacy `stripContactInfo` is now an opt-in fallback. The new
  // contract per PRD §5.1 is that validatePostInput uses
  // `containsContactInfo` to refuse the post with 400 instead.
  const dirty = "Call 0801 234 5678 today";
  assert.equal(containsContactInfo(dirty), true);
  assert.equal(stripContactInfo(dirty), "Call [contact removed] today");
});
