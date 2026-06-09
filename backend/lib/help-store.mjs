// PRD §14 — Help & Guide CMS IO.
import { insertRow, selectMany, selectOne, updateRows } from "./supabase.mjs";
import {
  HelpError,
  deriveExcerpt,
  pickArticleInput,
  validateArticle,
} from "./help.mjs";

const PUBLIC_SELECT = "id,slug,title,excerpt,category,tags,published_at,updated_at";

async function findArticleById(id) {
  return selectOne(
    "help_articles",
    `id=eq.${encodeURIComponent(id)}&select=*`,
  );
}

export async function findArticleBySlug(slug) {
  return selectOne(
    "help_articles",
    `slug=eq.${encodeURIComponent(slug)}&select=*`,
  );
}

export async function listPublishedArticles({ category, q, limit = 100 } = {}) {
  const params = new URLSearchParams();
  params.set("select", PUBLIC_SELECT);
  params.set("status", "eq.published");
  if (category) params.set("category", `eq.${category}`);
  if (q) {
    const like = `*${q.replace(/[(),]/g, " ").trim()}*`;
    params.set("or", `(title.ilike.${like},body.ilike.${like},excerpt.ilike.${like})`);
  }
  params.set("order", "published_at.desc.nullslast,updated_at.desc");
  params.set("limit", String(limit));
  return selectMany("help_articles", params.toString());
}

export async function listAllArticlesForAdmin({ status, limit = 200 } = {}) {
  const params = new URLSearchParams();
  params.set("select", "*");
  if (status) params.set("status", `eq.${status}`);
  params.set("order", "updated_at.desc");
  params.set("limit", String(limit));
  return selectMany("help_articles", params.toString());
}

export async function listArticleCategories() {
  // PostgREST has no DISTINCT; fold client-side.
  const rows = await selectMany(
    "help_articles",
    "select=category&status=eq.published&category=not.is.null",
  );
  const set = new Set();
  for (const r of rows) {
    if (r.category) set.add(r.category);
  }
  return Array.from(set).sort();
}

export async function createArticle({ input, authorId }) {
  const shaped = pickArticleInput(input);
  validateArticle(shaped);
  // slug uniqueness
  const existing = await findArticleBySlug(shaped.slug);
  if (existing) throw new HelpError(409, "An article with this slug already exists.", "slug");
  const row = {
    title: shaped.title,
    body: shaped.body,
    slug: shaped.slug,
    excerpt: shaped.excerpt ?? deriveExcerpt(shaped.body),
    category: shaped.category ?? null,
    tags: shaped.tags ?? [],
    status: shaped.status ?? "draft",
    author_id: authorId ?? null,
    published_at: shaped.status === "published" ? new Date().toISOString() : null,
  };
  return insertRow("help_articles", row, { returning: "representation" });
}

export async function updateArticle({ id, input }) {
  const current = await findArticleById(id);
  if (!current) throw new HelpError(404, "Article not found.");
  const shaped = pickArticleInput(input);
  const patch = {};
  if (shaped.title !== undefined) patch.title = shaped.title;
  if (shaped.body !== undefined) {
    patch.body = shaped.body;
    if (shaped.excerpt === undefined) {
      patch.excerpt = deriveExcerpt(shaped.body);
    }
  }
  if (shaped.excerpt !== undefined) patch.excerpt = shaped.excerpt;
  if (shaped.category !== undefined) patch.category = shaped.category;
  if (shaped.tags !== undefined) patch.tags = shaped.tags;
  if (shaped.slug && shaped.slug !== current.slug) {
    const conflict = await findArticleBySlug(shaped.slug);
    if (conflict && conflict.id !== current.id) {
      throw new HelpError(409, "Another article already owns this slug.", "slug");
    }
    patch.slug = shaped.slug;
  }
  if (Object.keys(patch).length === 0) return current;
  await updateRows("help_articles", `id=eq.${encodeURIComponent(id)}`, patch);
  return findArticleById(id);
}

export async function publishArticle({ id }) {
  const current = await findArticleById(id);
  if (!current) throw new HelpError(404, "Article not found.");
  await updateRows("help_articles", `id=eq.${encodeURIComponent(id)}`, {
    status: "published",
    published_at: current.published_at || new Date().toISOString(),
  });
  return findArticleById(id);
}

export async function archiveArticle({ id }) {
  const current = await findArticleById(id);
  if (!current) throw new HelpError(404, "Article not found.");
  await updateRows("help_articles", `id=eq.${encodeURIComponent(id)}`, {
    status: "archived",
  });
  return findArticleById(id);
}

export { findArticleById };
