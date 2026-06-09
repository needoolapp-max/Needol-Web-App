import { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { Review } from "@/lib/mockData";

type ApiReview = {
  id: string;
  rating: number;
  comment?: string | null;
  reviewer_kind?: string | null;
  trigger_type?: string | null;
  created_at?: string | null;
  target_user_id?: string | null;
  reply_body?: string | null;
  reply_evidence_url?: string | null;
  reply_created_at?: string | null;
  reply_locked_at?: string | null;
};

type ApiReviewsResponse = {
  data: {
    reviews: ApiReview[];
    aggregate: { average: number; count: number };
  };
};

type DisplayReview = {
  id: string;
  reviewer: string;
  rating: number;
  body: string;
  tag: "Verified Hire" | "Member";
  date: string;
  // PRD §9.6 — target-user reply state.
  replyBody?: string | null;
  replyDate?: string | null;
  replyLockedAt?: string | null;
  replyEvidenceUrl?: string | null;
  canReply?: boolean;
};

type ReviewsSectionProps = {
  userId: string;
  fallbackReviews: Review[];
  viewerUserId?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-3 w-3 ${i < rating ? "fill-accent text-accent" : "text-border"}`} />
      ))}
    </span>
  );
}

export function ReviewsSection({ userId, fallbackReviews, viewerUserId }: ReviewsSectionProps) {
  const shouldFetchLiveReviews = userId.startsWith("user_");
  const [apiReviews, setApiReviews] = useState<ApiReview[] | null>(null);
  const [aggregate, setAggregate] = useState<{ average: number; count: number } | null>(null);
  const [loading, setLoading] = useState(shouldFetchLiveReviews);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldFetchLiveReviews) return;
    let cancelled = false;
    setLoading(true);
    apiFetch<ApiReviewsResponse>(`/api/profiles/${encodeURIComponent(userId)}/reviews`)
      .then((res) => {
        if (cancelled) return;
        setApiReviews(res.data.reviews || []);
        setAggregate(res.data.aggregate || { average: 0, count: 0 });
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Reviews could not load.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shouldFetchLiveReviews, userId]);

  const displayReviews = useMemo<DisplayReview[]>(() => {
    if (shouldFetchLiveReviews) {
      return (apiReviews || []).map((review) => {
        const isTarget = Boolean(viewerUserId && review.target_user_id === viewerUserId);
        const replyLockPassed = review.reply_locked_at
          ? new Date(review.reply_locked_at).getTime() < Date.now()
          : false;
        return {
          id: review.id,
          reviewer: review.reviewer_kind === "employer" ? "Verified employer" : "Needool member",
          rating: Number(review.rating || 0),
          body: review.comment || "No written comment.",
          tag: review.trigger_type === "verified_hire" ? "Verified Hire" : "Member",
          date: formatDate(review.created_at),
          replyBody: review.reply_body || null,
          replyDate: review.reply_created_at ? formatDate(review.reply_created_at) : null,
          replyLockedAt: review.reply_locked_at || null,
          replyEvidenceUrl: review.reply_evidence_url || null,
          canReply: isTarget && (!review.reply_body || !replyLockPassed),
        };
      });
    }

    return fallbackReviews.map((review) => ({
      id: review.id,
      reviewer: review.reviewer,
      rating: review.rating,
      body: review.body,
      tag: review.tag,
      date: review.date,
    }));
  }, [apiReviews, fallbackReviews, shouldFetchLiveReviews, viewerUserId]);

  const average = shouldFetchLiveReviews
    ? aggregate?.average || 0
    : displayReviews.length
      ? displayReviews.reduce((sum, review) => sum + review.rating, 0) / displayReviews.length
      : 0;
  const count = shouldFetchLiveReviews ? aggregate?.count || 0 : displayReviews.length;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Reviews</h2>
        <div className="flex items-center gap-1.5 text-sm">
          <Star className="h-4 w-4 fill-accent text-accent" />
          <strong className="text-foreground">{average.toFixed(1)}</strong>
          <span className="text-muted-foreground">({count})</span>
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading reviews...</p>}
      {!loading && error && <p className="text-sm text-destructive">{error}</p>}
      {!loading && !error && displayReviews.length === 0 && (
        <p className="text-sm text-muted-foreground">No reviews yet.</p>
      )}
      {!loading && !error && displayReviews.length > 0 && (
        <div className="space-y-3">
          {displayReviews.map((review) => (
            <article key={review.id} data-test="review-row" className="rounded-2xl border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{review.reviewer}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        review.tag === "Verified Hire"
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {review.tag}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Stars rating={review.rating} />
                    <span>{review.date}</span>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">{review.body}</p>
              {(review.replyBody || review.canReply) && (
                <ReplyBlock
                  reviewId={review.id}
                  initialBody={review.replyBody || ""}
                  initialEvidenceUrl={review.replyEvidenceUrl || ""}
                  replyDate={review.replyDate}
                  canReply={Boolean(review.canReply)}
                  onSaved={(updated) => {
                    setApiReviews((prev) =>
                      (prev || []).map((r) => (r.id === review.id ? { ...r, ...updated } : r)),
                    );
                  }}
                />
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

// PRD §9.6 — review reply UI. Renders the existing reply (read-only) for
// everyone; for the target user it expands into an inline editor that POSTs
// to /api/reviews/:id/reply.
type ReplyApi = {
  reply_body?: string | null;
  reply_evidence_url?: string | null;
  reply_created_at?: string | null;
  reply_locked_at?: string | null;
};

function ReplyBlock({
  reviewId,
  initialBody,
  initialEvidenceUrl,
  replyDate,
  canReply,
  onSaved,
}: {
  reviewId: string;
  initialBody: string;
  initialEvidenceUrl: string;
  replyDate?: string | null;
  canReply: boolean;
  onSaved: (updated: ReplyApi) => void;
}) {
  const [editing, setEditing] = useState(!initialBody && canReply);
  const [body, setBody] = useState(initialBody);
  const [evidenceUrl, setEvidenceUrl] = useState(initialEvidenceUrl);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!body.trim()) {
      setError("Reply body is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const r = await apiFetch<{ data: ReplyApi }>(
        `/api/reviews/${encodeURIComponent(reviewId)}/reply`,
        {
          method: "POST",
          body: JSON.stringify({ body, evidence_url: evidenceUrl || undefined }),
        },
      );
      onSaved(r.data);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit reply.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!editing) {
    return (
      <div data-test="review-reply" className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Reply from the reviewed user{replyDate ? ` · ${replyDate}` : ""}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-foreground/90">{body || initialBody}</p>
        {(evidenceUrl || initialEvidenceUrl) && (
          <a
            href={evidenceUrl || initialEvidenceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-xs text-primary underline"
          >
            Evidence
          </a>
        )}
        {canReply && (
          <button
            type="button"
            data-test="review-reply-edit"
            onClick={() => setEditing(true)}
            className="mt-2 text-xs font-semibold text-primary hover:underline"
          >
            Edit reply
          </button>
        )}
      </div>
    );
  }

  return (
    <div data-test="review-reply-form" className="mt-3 rounded-xl border border-border bg-muted/20 p-3">
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Your reply
      </label>
      <textarea
        data-test="review-reply-body"
        rows={3}
        maxLength={1000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm text-foreground outline-none focus:border-primary"
        placeholder="Add a public response (max 1000 chars)…"
      />
      <input
        data-test="review-reply-evidence"
        type="url"
        placeholder="Optional evidence URL (https://…)"
        value={evidenceUrl}
        onChange={(e) => setEvidenceUrl(e.target.value)}
        className="mt-2 w-full rounded-lg border border-border bg-background p-2 text-xs text-foreground outline-none focus:border-primary"
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          data-test="review-reply-submit"
          onClick={submit}
          disabled={submitting || !body.trim()}
          className="inline-flex min-h-9 items-center justify-center rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {submitting ? "Saving…" : initialBody ? "Update reply" : "Post reply"}
        </button>
        {initialBody && (
          <button
            type="button"
            onClick={() => { setEditing(false); setBody(initialBody); setEvidenceUrl(initialEvidenceUrl); }}
            className="text-xs font-semibold text-muted-foreground hover:underline"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
