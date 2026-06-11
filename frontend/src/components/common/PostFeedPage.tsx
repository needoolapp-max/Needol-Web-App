import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { TopNav } from "@/components/nav/TopNav";
import { Footer } from "@/components/nav/Footer";
import { PostCard, type PostCardRow, type PostKind } from "@/components/cards/PostCard";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { PlusCircle, ShieldCheck } from "lucide-react";

export type { PostKind };

type PostRow = PostCardRow & {
  description: string;
  thumbnail_url?: string | null;
};

type Props = {
  kind: PostKind;
  title: string;
  subtitle: string;
  emptyText: string;
  createHref?: string;
};

export function PostFeedPage({ kind, title, subtitle, emptyText, createHref }: Props) {
  const { user, state, getToken, loading: authLoading } = useAuth();
  const [items, setItems] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    setLoading(true);
    apiFetch<{ data: PostRow[] }>(`/api/posts?kind=${kind}`, { getToken })
      .then((result) => {
        if (cancelled) return;
        setItems(result.data || []);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Failed to load posts.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, kind, getToken, user?.id]);

  const canCreate = state === "active" && createHref;

  // Padded result count, e.g. 047 (mono ledger anatomy).
  const countTag = String(items.length).padStart(3, "0");
  const kindLabel =
    kind === "need" ? "Need Requests" : kind === "opportunity" ? "Opportunities" : "Events";

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
          <section>
            <header className="border-t-2 border-foreground pt-6">
              <div className="flex items-baseline justify-between gap-4">
                <div className="flex items-baseline gap-4">
                  <span
                    aria-hidden
                    className="font-mono text-sm font-semibold tracking-[0.16em] text-foreground"
                  >
                    {countTag}
                  </span>
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {kindLabel}
                  </span>
                </div>
                {canCreate && (
                  <Link
                    to={createHref!}
                    className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90"
                  >
                    <PlusCircle className="h-4 w-4" />
                    New {kind === "need" ? "Need Request" : "Opportunity"}
                  </Link>
                )}
              </div>
              <h1 className="mt-4 max-w-3xl font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                {title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                {subtitle}
              </p>
            </header>

            <div className="mt-10">
              {loading && (
                <div className="border border-dashed border-border p-10 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Loading
                </div>
              )}

              {error && !loading && (
                <div className="border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
                  {error}
                </div>
              )}

              {!loading && !error && items.length === 0 && (
                <div className="border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                  {emptyText}
                </div>
              )}

              {!loading && !error && items.length > 0 && (
                <div className="grid gap-5 md:grid-cols-2">
                  {items.map((post, i) => (
                    <PostCard key={post.id} post={post} index={i} />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Ruled aside — no card chrome. */}
          <aside className="space-y-6 border-t-2 border-foreground pt-6 lg:border-t-0 lg:border-l lg:border-border lg:pl-6 lg:pt-0">
            <div>
              <h2 className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                <ShieldCheck className="h-3 w-3" />
                {user ? "Welcome back" : "Sign in for full visibility"}
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {user
                  ? state === "active"
                    ? "Your active subscription unlocks contact info, full descriptions, and posting."
                    : "Activate your subscription to post and to see contact info."
                  : "Visitors see post summaries. Sign in to see full descriptions, links, and contact reveals."}
              </p>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
