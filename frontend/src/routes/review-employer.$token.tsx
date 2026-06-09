import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TopNav } from "@/components/nav/TopNav";
import { Footer } from "@/components/nav/Footer";
import { apiFetch, ApiError } from "@/lib/api";

type TokenInfo = {
  verifiedHireId: string;
  applicant: { username?: string; name?: string; avatar?: string } | null;
  employerName?: string;
  reviewerUnlockAt?: string;
  reviewWindowEndAt?: string;
};

export const Route = createFileRoute("/review-employer/$token")({
  head: () => ({ meta: [{ title: "Submit a review - Needool" }] }),
  component: EmployerReviewPage,
});

function EmployerReviewPage() {
  const { token } = Route.useParams();
  const [info, setInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ data: TokenInfo }>(`/api/reviews/token/${encodeURIComponent(token)}`)
      .then((r) => {
        if (!cancelled) setInfo(r.data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || "Token not recognized.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    const fd = new FormData(event.currentTarget);
    apiFetch("/api/reviews/by-token", {
      method: "POST",
      body: JSON.stringify({
        token,
        rating,
        comment: String(fd.get("comment") || ""),
        evidenceUrl: String(fd.get("evidenceUrl") || ""),
      }),
    })
      .then(() => setSubmitted(true))
      .catch((err) => setSubmitError(err instanceof ApiError ? err.message : "Failed to submit."))
      .finally(() => setSubmitting(false));
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-3xl font-extrabold text-foreground">Review your hire</h1>
        {loading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}
        {loadError && <p className="mt-4 text-sm text-destructive">{loadError}</p>}
        {info && (
          <>
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
              {info.applicant?.avatar && (
                <img
                  src={info.applicant.avatar}
                  alt={info.applicant?.name || info.applicant?.username || "Applicant"}
                  className="h-12 w-12 rounded-full object-cover"
                />
              )}
              <p className="text-sm text-muted-foreground">
                You're leaving a review for{" "}
                <strong className="text-foreground">
                  {info.applicant?.name || info.applicant?.username || "the applicant"}
                </strong>.
              </p>
            </div>
            {submitted ? (
              <div className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center">
                <h2 className="text-lg font-bold text-foreground">Thanks — your review is live.</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  It now appears on the applicant's profile.
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
                <fieldset className="flex flex-col gap-2 text-left">
                  <legend className="text-sm font-medium text-foreground">Rating</legend>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRating(n)}
                        className={`rounded-xl border px-3 py-2 text-sm font-semibold ${rating === n ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground hover:bg-muted"}`}
                      >
                        {n}★
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label className="flex flex-col gap-1.5 text-left">
                  <span className="text-sm font-medium text-foreground">Comment</span>
                  <textarea name="comment" rows={5} className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
                </label>
                <label className="flex flex-col gap-1.5 text-left">
                  <span className="text-sm font-medium text-foreground">Evidence link {(rating <= 2) && <span className="text-destructive">*</span>}</span>
                  <input
                    name="evidenceUrl"
                    type="url"
                    placeholder="https://"
                    required={rating <= 2}
                    className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
                {submitError && <p className="text-sm text-destructive">{submitError}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {submitting ? "Submitting…" : "Submit review"}
                </button>
              </form>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
