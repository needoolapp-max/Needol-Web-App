import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { TopNav } from "@/components/nav/TopNav";
import { Footer } from "@/components/nav/Footer";
import { GlowCard } from "@/components/ui/spotlight-card";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { ArrowRight, MapPin, PlusCircle, ShieldCheck } from "lucide-react";

export type PostKind = "need" | "opportunity" | "event";

type PostRow = {
  id: string;
  kind: PostKind;
  title: string;
  description: string;
  thumbnail_url?: string | null;
  scope?: string;
  scope_country?: string | null;
  scope_state?: string | null;
  scope_city?: string | null;
  created_at?: string;
  pinned?: boolean;
  likeCount?: number;
  saveCount?: number;
  commentCount?: number;
  isLiked?: boolean;
  isSaved?: boolean;
};

type Props = {
  kind: PostKind;
  title: string;
  subtitle: string;
  emptyText: string;
  createHref?: string;
};

function formatLocation(post: PostRow): string {
  const parts = [post.scope_city, post.scope_state, post.scope_country].filter(Boolean);
  if (parts.length) return parts.join(", ");
  if (post.scope === "worldwide") return "Worldwide";
  return post.scope ? post.scope : "Anywhere";
}

function formatPostedAgo(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return "Today";
  if (diff < 2 * day) return "Yesterday";
  if (diff < 7 * day) return `${Math.floor(diff / day)} days ago`;
  return d.toLocaleDateString();
}

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
              <div className="grid gap-4 md:grid-cols-2">
                {items.map((post) => (
                  <GlowCard
                    key={post.id}
                    customSize
                    className="flex flex-col rounded-2xl p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          {kind.toUpperCase()}
                        </p>
                        <h2 className="mt-1 text-lg font-bold text-foreground">{post.title}</h2>
                      </div>
                      {post.pinned && (
                        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                          Pinned
                        </span>
                      )}
                    </div>
                    {post.description && (
                      <p className="mt-3 line-clamp-4 text-sm leading-6 text-foreground/80">
                        {post.description}
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {formatLocation(post)}
                      </span>
                      <span>·</span>
                      <span>{formatPostedAgo(post.created_at)}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className={post.isLiked ? "font-semibold text-rose-600 dark:text-rose-300" : ""}>
                        ♥ {post.likeCount ?? 0}
                      </span>
                      <span>· 💬 {post.commentCount ?? 0}</span>
                      <span className={post.isSaved ? "font-semibold text-primary" : ""}>· 🔖 {post.saveCount ?? 0}</span>
                    </div>
                    <Link
                      to="/posts/$id"
                      params={{ id: post.id }}
                      className="mt-4 inline-flex items-center gap-1.5 self-start rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      View details <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </GlowCard>
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
