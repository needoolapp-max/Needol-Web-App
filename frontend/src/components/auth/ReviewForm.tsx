import { useState } from "react";
import { Star } from "lucide-react";

/**
 * Phase 10-2 — Shared editorial review form. Extracted from the
 * TriggerBReviewModal pattern in routes/p.$username.tsx so the same form
 * can be reused by the standalone review routes
 * (/review-employer/$token and /reviews/$verifiedHireId) without
 * duplicating the rating + comment + evidence affordances.
 *
 * Visual contract:
 *   * Mono uppercase labels for Rating, Comment, Evidence link.
 *   * Bare star buttons (no rounded bg-primary/10 pill, no border).
 *   * Hairline rounded-lg textarea + url input matching the onboarding
 *     form's `inputClass` pattern.
 *   * Dark monochrome ink-on-foreground submit (Cancel is hairline
 *     secondary when shown — modal contexts pass an `onCancel`).
 *   * Evidence input appears automatically when the rating is in the
 *     `requireEvidenceOn` set (default [1, 2] per PRD §9.5).
 */
export type ReviewFormSubmitPayload = {
  rating: number;
  comment: string;
  evidenceUrl?: string;
};

export type ReviewFormProps = {
  onSubmit: (payload: ReviewFormSubmitPayload) => void | Promise<void>;
  onCancel?: () => void;
  busy?: boolean;
  /** Rating values that REQUIRE an evidence URL (default: 1 and 2 stars). */
  requireEvidenceOn?: readonly number[];
  /** Submit button label override. */
  submitLabel?: string;
  /** Initial values for re-entry. */
  initial?: Partial<ReviewFormSubmitPayload>;
  /** Show the "held for admin pre-approval" note on low ratings. */
  showHeldNote?: boolean;
};

const FORM_INPUT_CLASS =
  "w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const LABEL_CLASS =
  "font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/80";

export function ReviewForm({
  onSubmit,
  onCancel,
  busy = false,
  requireEvidenceOn = [1, 2],
  submitLabel = "Submit review",
  initial,
  showHeldNote = true,
}: ReviewFormProps) {
  const [rating, setRating] = useState(initial?.rating ?? 5);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [evidenceUrl, setEvidenceUrl] = useState(initial?.evidenceUrl ?? "");
  const evidenceRequired = requireEvidenceOn.includes(rating);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    if (evidenceRequired && !evidenceUrl) return;
    void onSubmit({
      rating,
      comment,
      evidenceUrl: evidenceUrl || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-test="review-form">
      <div>
        <label className={LABEL_CLASS}>Rating</label>
        <div className="mt-2 flex items-center gap-1" data-test="review-stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              data-test={`review-star-${n}`}
              onClick={() => setRating(n)}
              className="p-1 transition-colors"
              aria-label={`${n} stars`}
              aria-pressed={n <= rating}
            >
              <Star
                className={`h-6 w-6 ${
                  n <= rating
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="review-form-comment" className={LABEL_CLASS}>
          Comment (optional)
        </label>
        <textarea
          id="review-form-comment"
          data-test="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 1500))}
          className={`${FORM_INPUT_CLASS} mt-2`}
          rows={4}
          maxLength={1500}
          placeholder="What worked, what didn't?"
        />
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {comment.length}/1500 &middot; Phone/email auto-stripped
        </p>
      </div>

      {evidenceRequired && (
        <div>
          <label htmlFor="review-form-evidence" className={LABEL_CLASS}>
            Evidence link (required for 1–2&star;)
          </label>
          <input
            id="review-form-evidence"
            data-test="review-evidence"
            type="url"
            value={evidenceUrl}
            onChange={(e) => setEvidenceUrl(e.target.value)}
            className={`${FORM_INPUT_CLASS} mt-2`}
            placeholder="https://example.com/screenshot.png"
            required
          />
        </div>
      )}

      {showHeldNote && evidenceRequired && (
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber-600 dark:text-amber-400">
          Low-rated reviews are held for admin pre-approval before going public.
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-foreground"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          data-test="review-submit"
          disabled={busy || (evidenceRequired && !evidenceUrl)}
          className="inline-flex min-h-11 items-center rounded-lg bg-foreground px-4 py-2 text-sm font-bold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Submitting…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
