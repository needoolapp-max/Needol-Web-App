// PRD §14 — Help & Guide list view. Public + SEO-indexed.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TopNav } from "@/components/nav/TopNav";
import { Footer } from "@/components/nav/Footer";
import { apiFetch } from "@/lib/api";
import { Search as SearchIcon, BookOpen } from "lucide-react";

interface HelpSearch {
  q?: string;
  category?: string;
}

type HelpListItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  tags: string[];
  published_at: string | null;
  updated_at: string;
};

type HelpListResponse = {
  data: { articles: HelpListItem[]; categories: string[] };
};

export const Route = createFileRoute("/help/")({
  validateSearch: (s: Record<string, unknown>): HelpSearch => {
    const out: HelpSearch = {};
    if (typeof s.q === "string") out.q = s.q;
    if (typeof s.category === "string") out.category = s.category;
    return out;
  },
  head: () => ({
    meta: [
      { title: "Help & Guide — Needool" },
      { name: "description", content: "Articles, guides, and answers from the Needool team." },
      { property: "og:title", content: "Help & Guide — Needool" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "canonical", href: `${(import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) || "https://needool.com"}/help` },
    ],
  }),
  component: HelpPage,
});

function HelpPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [data, setData] = useState<HelpListResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qInput, setQInput] = useState(search.q ?? "");

  useEffect(() => {
    const qs = new URLSearchParams();
    if (search.q) qs.set("q", search.q);
    if (search.category) qs.set("category", search.category);
    setLoading(true);
    apiFetch<HelpListResponse>(`/api/help/articles?${qs.toString()}`)
      .then((r) => { setData(r.data); setError(null); })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load."))
      .finally(() => setLoading(false));
  }, [search.q, search.category]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    void navigate({ search: { q: qInput || undefined, category: search.category } });
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <header className="mb-6">
          <h1 className="flex items-center gap-2 text-3xl font-extrabold text-foreground">
            <BookOpen className="h-6 w-6" /> Help &amp; Guide
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            How Needool works. Browse articles or search by topic.
          </p>
        </header>

        <form onSubmit={submit} className="mb-6 flex gap-2" data-test="help-search-form">
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Search articles…"
            className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm"
            data-test="help-search-input"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            data-test="help-search-submit"
          >
            <SearchIcon className="h-4 w-4" /> Search
          </button>
        </form>

        {data?.categories && data.categories.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2" data-test="help-categories">
            <button
              onClick={() => navigate({ search: { q: search.q, category: undefined } })}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${!search.category ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card hover:bg-muted"}`}
            >All</button>
            {data.categories.map((c) => (
              <button
                key={c}
                onClick={() => navigate({ search: { q: search.q, category: c } })}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${search.category === c ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card hover:bg-muted"}`}
              >{c}</button>
            ))}
          </div>
        )}

        {loading && <p data-test="help-loading" className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p data-test="help-error" className="text-sm text-destructive">{error}</p>}

        {!loading && data?.articles.length === 0 && (
          <p data-test="help-empty" className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No articles yet. Check back soon.
          </p>
        )}

        <ul className="grid gap-3 sm:grid-cols-2" data-test="help-articles">
          {data?.articles.map((a) => (
            <li
              key={a.id}
              data-test="help-article-card"
              data-slug={a.slug}
              className="rounded-2xl border border-border bg-card p-4 hover:border-primary/50 transition"
            >
              {a.category && (
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{a.category}</p>
              )}
              <Link to="/help/$slug" params={{ slug: a.slug }} className="mt-1 block text-base font-bold text-foreground hover:underline">
                {a.title}
              </Link>
              {a.excerpt && (
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{a.excerpt}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(a.tags || []).slice(0, 4).map((t) => (
                  <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">{t}</span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </main>
      <Footer />
    </div>
  );
}
