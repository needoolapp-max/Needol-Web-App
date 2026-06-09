// PRD §14 — Help & Guide article detail. Public + SEO-indexed.
// Markdown rendering is intentionally minimal (no external dep) — headings,
// paragraphs, lists, inline code, links. PRs touching markdown that need
// tables / images should pull in `marked` or similar at that point.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import DOMPurify, { type Config as DOMPurifyConfig } from "dompurify";
import { TopNav } from "@/components/nav/TopNav";
import { Footer } from "@/components/nav/Footer";
import { apiFetch } from "@/lib/api";
import { BookOpen, ChevronLeft } from "lucide-react";

type HelpArticle = {
  id: string;
  slug: string;
  title: string;
  body: string;
  excerpt: string | null;
  category: string | null;
  tags: string[];
  published_at: string | null;
  updated_at: string;
};

type HelpDetailResponse = { data: HelpArticle };

export const Route = createFileRoute("/help/$slug")({
  head: ({ params }) => {
    const title = `Help — Needool`;
    const url = `${(import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) || "https://needool.com"}/help/${params.slug}`;
    return {
      meta: [
        { title },
        { property: "og:title", content: title },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [
        { rel: "canonical", href: url },
      ],
    };
  },
  component: HelpArticlePage,
});

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Minimal markdown subset → HTML.
function renderMarkdown(md: string): string {
  if (!md) return "";
  const blocks = md.split(/\n{2,}/);
  return blocks
    .map((block) => {
      const trimmed = block.trim();
      // Headings
      const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        const level = heading[1].length;
        return `<h${level}>${inline(heading[2])}</h${level}>`;
      }
      // Unordered list
      if (/^([-*]\s+).+/.test(trimmed)) {
        const items = trimmed.split(/\n/).map((line) =>
          `<li>${inline(line.replace(/^[-*]\s+/, ""))}</li>`,
        ).join("");
        return `<ul>${items}</ul>`;
      }
      // Numbered list
      if (/^\d+\.\s+.+/.test(trimmed)) {
        const items = trimmed.split(/\n/).map((line) =>
          `<li>${inline(line.replace(/^\d+\.\s+/, ""))}</li>`,
        ).join("");
        return `<ol>${items}</ol>`;
      }
      // Paragraph (default)
      return `<p>${inline(trimmed.replace(/\n/g, " "))}</p>`;
    })
    .join("\n");
}

function inline(text: string): string {
  let s = escapeHtml(text);
  // Bold: **x** or __x__
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  // Italic: *x* or _x_
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(/_([^_]+)_/g, "<em>$1</em>");
  // Inline code
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Links [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) return label;
    return `<a href="${url}" target="_blank" rel="noreferrer">${label}</a>`;
  });
  return s;
}

// Phase 8-1 — defense-in-depth XSS layer. The in-house renderer already
// HTML-escapes inline content via inline(), but DOMPurify is the
// belt-and-braces sanitizer that catches any future regression (e.g. a
// new inline rule that forgets to escape). Allows the small markdown
// subset we render and nothing else.
const PURIFY_CONFIG: DOMPurifyConfig = {
  ALLOWED_TAGS: [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "ul", "ol", "li",
    "strong", "em", "code", "a",
    "br",
  ],
  ALLOWED_ATTR: ["href", "target", "rel"],
  // Reject any URI that isn't http(s) or a relative path. DOMPurify
  // already strips javascript:, data:, and vbscript: — this just makes
  // it explicit.
  ALLOWED_URI_REGEXP: /^(?:(?:https?:)?\/\/|\/|#)/i,
  KEEP_CONTENT: true,
};

function HelpArticlePage() {
  const { slug } = Route.useParams();
  const [data, setData] = useState<HelpArticle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const safeHtml = useMemo(() => {
    if (!data?.body) return "";
    return DOMPurify.sanitize(renderMarkdown(data.body), PURIFY_CONFIG);
  }, [data?.body]);

  useEffect(() => {
    setLoading(true);
    apiFetch<HelpDetailResponse>(`/api/help/articles/${encodeURIComponent(slug)}`)
      .then((r) => { setData(r.data); setError(null); })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load."))
      .finally(() => setLoading(false));
  }, [slug]);

  // PRD §4.4 — JSON-LD Article for SEO.
  useEffect(() => {
    if (!data) return;
    const id = "needool-help-jsonld";
    const ld = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: data.title,
      description: data.excerpt || undefined,
      datePublished: data.published_at || undefined,
      dateModified: data.updated_at,
      author: { "@type": "Organization", name: "Needool" },
      url: `${(import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) || "https://needool.com"}/help/${data.slug}`,
    });
    const existing = document.getElementById(id);
    if (existing) {
      existing.textContent = ld;
    } else {
      const s = document.createElement("script");
      s.type = "application/ld+json";
      s.id = id;
      s.textContent = ld;
      document.head.appendChild(s);
    }
    return () => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, [data]);

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link to="/help" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ChevronLeft className="h-4 w-4" /> All articles
        </Link>

        {loading && <p data-test="help-detail-loading" className="text-sm text-muted-foreground">Loading…</p>}
        {error && (
          <p data-test="help-detail-error" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </p>
        )}

        {data && (
          <article data-test="help-detail">
            <header className="mb-4">
              {data.category && (
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{data.category}</p>
              )}
              <h1 data-test="help-detail-title" className="mt-1 flex items-start gap-2 text-3xl font-extrabold text-foreground">
                <BookOpen className="mt-1 h-6 w-6 shrink-0" /> {data.title}
              </h1>
              <p className="mt-2 text-xs text-muted-foreground">
                Updated {new Date(data.updated_at).toLocaleDateString()}
              </p>
            </header>

            <div
              data-test="help-detail-body"
              className="prose prose-sm max-w-none text-foreground/90 [&_h1]:mt-6 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-bold [&_p]:my-3 [&_p]:leading-7 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs [&_a]:text-primary [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: safeHtml }}
            />
          </article>
        )}
      </main>
      <Footer />
    </div>
  );
}
