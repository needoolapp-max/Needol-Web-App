import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { TopNav } from "@/components/nav/TopNav";
import { Footer } from "@/components/nav/Footer";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, ApiError } from "@/lib/api";

export const Route = createFileRoute("/reviews/$verifiedHireId")({
  head: () => ({ meta: [{ title: "Leave a review - Needool" }] }),
  component: ReviewPage,
});

function ReviewPage() {
  const { verifiedHireId } = Route.useParams();
  const { user, getToken } = useAuth();
  const navigate = useNavigate();
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      setError("Sign in to leave a review.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const fd = new FormData(event.currentTarget);
    apiFetch("/api/reviews", {
      method: "POST",
      getToken,
      body: JSON.stringify({
        verifiedHireId,
        rating,
        comment: String(fd.get("comment") || ""),
        evidenceUrl: String(fd.get("evidenceUrl") || ""),
      }),
    })
      .then(() => {
        setSuccess(true);
        window.setTimeout(() => navigate({ to: "/dashboard/applications" }), 2000);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Failed to submit review.");
      })
      .finally(() => setSubmitting(false));
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-3xl font-extrabold text-foreground">Leave a review</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Share your experience with the employer who hired you. Reviews open 7 days after a hire is recorded and stay editable for 14 days.
        </p>

        {success ? (
          <div className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center">
            <h2 className="text-lg font-bold text-foreground">Review submitted</h2>
            <p className="mt-2 text-sm text-muted-foreground">Redirecting to your applications…</p>
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
              {(rating === 1 || rating === 2) && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Evidence link is required for ratings of 1 or 2.
                </p>
              )}
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
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit review"}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              <Link to="/dashboard/applications" className="font-semibold text-primary underline">Back to applications</Link>
            </p>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}
