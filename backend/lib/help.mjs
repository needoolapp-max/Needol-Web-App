// PRD §14 — Help & Guide CMS pure logic. IO lives in help-store.mjs.

export const ARTICLE_STATUSES = ["draft", "published", "archived"];
export const MAX_SLUG = 100;
export const MAX_TITLE = 200;

export class HelpError extends Error {
  constructor(status, message, field) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

// Convert "Getting Started — A Quick Guide" → "getting-started-a-quick-guide".
// Trailing hyphens are trimmed; runs collapsed. Length capped at MAX_SLUG.
export function slugify(text) {
  if (!text) return "";
  return String(text)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining marks
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG);
}

// PRD §14 — admin-authored article. Body is markdown; we keep validation
// minimal so editors aren't fighting the form.
export function pickArticleInput(input = {}) {
  const out = {};
  if (typeof input.title === "string") out.title = input.title.trim().slice(0, MAX_TITLE);
  if (typeof input.body === "string") out.body = input.body;
  if (typeof input.excerpt === "string") out.excerpt = input.excerpt.trim().slice(0, 500) || null;
  if (typeof input.category === "string") out.category = input.category.trim().slice(0, 80) || null;
  if (Array.isArray(input.tags)) {
    out.tags = input.tags
      .filter((t) => typeof t === "string" && t.trim())
      .map((t) => t.trim().slice(0, 40))
      .slice(0, 12);
  }
  if (typeof input.slug === "string" && input.slug.trim()) {
    out.slug = slugify(input.slug);
  } else if (typeof input.title === "string") {
    out.slug = slugify(input.title);
  }
  if (typeof input.status === "string" && ARTICLE_STATUSES.includes(input.status)) {
    out.status = input.status;
  }
  return out;
}

export function validateArticle(input) {
  if (!input.title) throw new HelpError(400, "title is required.", "title");
  if (!input.body) throw new HelpError(400, "body is required.", "body");
  if (!input.slug) throw new HelpError(400, "slug could not be derived.", "slug");
  if (input.slug.length > MAX_SLUG) {
    throw new HelpError(400, `slug too long (max ${MAX_SLUG}).`, "slug");
  }
  if (input.title.length > MAX_TITLE) {
    throw new HelpError(400, `title too long (max ${MAX_TITLE}).`, "title");
  }
}

// PRD §14 — public viewing limited to published articles. Admin sees all.
export function isVisibleToVisitor(row) {
  return Boolean(row && row.status === "published");
}

// Lightweight derived excerpt: strip markdown emphasis chars, take the first
// non-blank line, cap at 240 chars.
export function deriveExcerpt(body) {
  if (!body) return "";
  const flat = String(body)
    .replace(/[#*_`~>[\]()]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return flat.length > 240 ? `${flat.slice(0, 237)}…` : flat;
}
