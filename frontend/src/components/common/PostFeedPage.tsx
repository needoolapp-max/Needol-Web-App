import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { TopNav } from "@/components/nav/TopNav";
import { Footer } from "@/components/nav/Footer";
import { GlowCard } from "@/components/ui/spotlight-card";
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

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  Needool · {kind === "need" ? "Need Requests" : kind === "opportunity" ? "Opportunities" : "Events"}
                </p>
                <h1 className="mt-2 text-3xl font-extrabold text-foreground sm:text-4xl">{title}</h1>
                <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">{subtitle}</p>
              </div>
              {canCreate && (
                <Link
                  to={createHref!}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <PlusCircle className="h-4 w-4" />
                  New {kind === "need" ? "Need Request" : "Opportunity"}
                </Link>
              )}
            </div>

            {loading && (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                Loading…
              </div>
            )}

            {error && !loading && (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
                {error}
              </div>
            )}

            {!loading && !error && items.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
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
          </section>

          <aside className="space-y-4">
            <GlowCard customSize className="rounded-2xl p-5">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                {user ? "Welcome back" : "Sign in for full visibility"}
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {user
                  ? state === "active"
                    ? "Your active subscription unlocks contact info, full descriptions, and posting."
                    : "Activate your subscription to post and to see contact info."
                  : "Visitors see post summaries. Sign in to see full descriptions, links, and contact reveals."}
              </p>
            </GlowCard>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
