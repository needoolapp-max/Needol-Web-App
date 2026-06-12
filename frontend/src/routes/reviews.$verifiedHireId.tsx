import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { TopNav } from "@/components/nav/TopNav";
import { Footer } from "@/components/nav/Footer";
import { ReviewForm, type ReviewFormSubmitPayload } from "@/components/auth/ReviewForm";
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit({ rating, comment, evidenceUrl }: ReviewFormSubmitPayload) {
    if (!user) {
      setError("Sign in to leave a review.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/reviews", {
        method: "POST",
        getToken,
        body: JSON.stringify({
          verifiedHireId,
          rating,
          comment,
          evidenceUrl: evidenceUrl ?? "",
        }),
      });
      setSuccess(true);
      window.setTimeout(() => navigate({ to: "/dashboard/applications" }), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-2xl px-4 py-12">
        {/* Editorial header — numbered section anatomy matches the rest of
            the site. */}
        <header className="border-t-2 border-foreground pt-6">
          <div className="flex items-baseline gap-4">
            <span
              aria-hidden
              className="font-mono text-sm font-semibold tracking-[0.16em] text-foreground"
            >
              01
            </span>
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-foreground/85">
              Review
            </span>
          </div>
          <h1 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Leave a review.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
            Share your experience with the employer who hired you. Reviews open
            7 days after a hire is recorded and stay editable for 14 days.
          </p>
        </header>

        <div className="mt-10">
          {success ? (
            <aside className="flex flex-col gap-2 border-y border-foreground py-5">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground">
                Submitted
              </p>
              <p className="text-sm text-muted-foreground">
                Redirecting to your applications…
              </p>
            </aside>
          ) : (
            <>
              <ReviewForm
                onSubmit={handleSubmit}
                busy={submitting}
                submitLabel="Submit review"
              />
              {error && (
                <p className="mt-4 text-sm text-destructive">{error}</p>
              )}
              <p className="mt-6 text-center">
                <Link
                  to="/dashboard/applications"
                  className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground underline underline-offset-4"
                >
                  Back to applications
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
