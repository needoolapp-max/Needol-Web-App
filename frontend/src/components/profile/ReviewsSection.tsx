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
    <div>
      {/* Aggregate header — inline mono row, no card chrome. */}
      <div className="mb-5 flex items-center justify-between border-b border-border pb-3">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/70">
          Aggregate
        </span>
        <div className="flex items-center gap-2 font-mono text-sm font-semibold text-foreground">
          <Star className="h-3.5 w-3.5 fill-accent text-accent" />
          {average.toFixed(1)}
          <span className="font-medium text-muted-foreground">({count})</span>
        </div>
      </div>

      {loading && (
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Loading reviews…
        </p>
      )}
      {!loading && error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {!loading && !error && displayReviews.length === 0 && (
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          No reviews yet
        </p>
      )}
      {!loading && !error && displayReviews.length > 0 && (
        <ul className="divide-y divide-border border-y border-border">
          {displayReviews.map((review) => (
            <li
              key={review.id}
              data-test="review-row"
              className="py-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-sm font-semibold text-foreground">{review.reviewer}</span>
                    <span
                      className={`font-mono text-[10px] font-semibold uppercase tracking-[0.18em] ${
                        review.tag === "Verified Hire"
                          ? "text-success"
                          : "text-muted-foreground"
                      }`}
                    >
                      {review.tag}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    <Stars rating={review.rating} />
                    <span aria-hidden className="h-3 w-px bg-border" />
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
                      (prev || []).map((r) =>
                        r.id === review.id ? { ...r, ...updated } : r,
                      ),
                    );
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
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
      <div
        data-test="review-reply"
        className="mt-4 border-l border-border pl-4"
      >
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Reply from the reviewed user
          {replyDate && (
            <span aria-hidden className="mx-2">
              &middot;
            </span>
          )}
          {replyDate && <span className="text-foreground/70">{replyDate}</span>}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-foreground/90">
          {body || initialBody}
        </p>
        {(evidenceUrl || initialEvidenceUrl) && (
          <a
            href={evidenceUrl || initialEvidenceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block font-mono text-[11px] uppercase tracking-[0.18em] text-foreground underline underline-offset-4"
          >
            Evidence
          </a>
        )}
        {canReply && (
          <button
            type="button"
            data-test="review-reply-edit"
            onClick={() => setEditing(true)}
            className="mt-2 block font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/70 transition-colors hover:text-foreground"
          >
            Edit reply
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      data-test="review-reply-form"
      className="mt-4 space-y-3 border-l border-border pl-4"
    >
      <label className="block font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/80">
        Your reply
      </label>
      <textarea
        data-test="review-reply-body"
        rows={3}
        maxLength={1000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="w-full rounded-lg border border-input bg-card p-3 text-sm text-foreground transition-colors focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        placeholder="Add a public response (max 1000 chars)…"
      />
      <input
        data-test="review-reply-evidence"
        type="url"
        placeholder="Optional evidence URL (https://…)"
        value={evidenceUrl}
        onChange={(e) => setEvidenceUrl(e.target.value)}
        className="w-full rounded-lg border border-input bg-card p-2 text-xs text-foreground transition-colors focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          data-test="review-reply-submit"
          onClick={submit}
          disabled={submitting || !body.trim()}
          className="inline-flex min-h-9 items-center justify-center rounded-lg bg-foreground px-3 py-1.5 text-xs font-bold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Saving…" : initialBody ? "Update reply" : "Post reply"}
        </button>
        {initialBody && (
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setBody(initialBody);
              setEvidenceUrl(initialEvidenceUrl);
            }}
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
