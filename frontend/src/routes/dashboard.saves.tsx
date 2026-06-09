import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";

type SavedItem = {
  saved_at: string;
  post: {
    id: string;
    kind: "need" | "opportunity" | "event";
    title: string;
    description?: string;
    scope_city?: string | null;
    scope_state?: string | null;
    scope_country?: string | null;
  };
};

export const Route = createFileRoute("/dashboard/saves")({
  head: () => ({ meta: [{ title: "Saved posts - Needool" }] }),
  component: SavesPage,
});

function SavesPage() {
  const { getToken } = useAuth();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const r = await apiFetch<{ data: SavedItem[] }>("/api/me/saves", { getToken });
      setItems(r.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load saves.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void reload();
  }, [reload]);

  function formatLocation(p: SavedItem["post"]): string {
    const parts = [p.scope_city, p.scope_state, p.scope_country].filter(Boolean);
    return parts.length ? parts.join(", ") : "Anywhere";
  }

  return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground">Saved posts</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Posts you've bookmarked from Need Requests, Opportunities, and Events.
        </p>

        {loading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="mt-6 text-sm text-destructive">{error}</p>}

        {!loading && !error && items.length === 0 && (
          <p className="mt-6 text-sm text-muted-foreground">
            You haven't saved any posts yet. Open a{" "}
            <Link to="/needs" className="font-semibold text-primary underline">Need Request</Link> and tap Save.
          </p>
        )}

        <ul className="mt-6 space-y-3">
          {items.map((row) => (
            <li
              key={row.post.id}
              className="rounded-2xl border border-border bg-card p-4"
              data-test="saved-item"
              data-post-id={row.post.id}
            >
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {row.post.kind.toUpperCase()}
              </p>
              <h2 className="mt-1 text-base font-bold text-foreground">{row.post.title}</h2>
              {row.post.description && (
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                  {row.post.description}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatLocation(row.post)} · saved {new Date(row.saved_at).toLocaleDateString()}</span>
                <Link
                  to="/posts/$id"
                  params={{ id: row.post.id }}
                  className="font-semibold text-primary hover:underline"
                >
                  Open →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
  );
}
