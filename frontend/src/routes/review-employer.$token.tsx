import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TopNav } from "@/components/nav/TopNav";
import { Footer } from "@/components/nav/Footer";
import { ReviewForm, type ReviewFormSubmitPayload } from "@/components/auth/ReviewForm";
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

  async function handleSubmit({ rating, comment, evidenceUrl }: ReviewFormSubmitPayload) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await apiFetch("/api/reviews/by-token", {
        method: "POST",
        body: JSON.stringify({
          token,
          rating,
          comment,
          evidenceUrl: evidenceUrl ?? "",
        }),
      });
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-2xl px-4 py-12">
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
            Review your hire.
          </h1>
        </header>

        {loading && (
          <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Loading
          </p>
        )}
        {loadError && (
          <p className="mt-8 text-sm text-destructive">{loadError}</p>
        )}

        {info && (
          <>
            {/* Applicant strip — hairline ruled instead of rounded-2xl card. */}
            <div className="mt-8 flex items-center gap-4 border-y border-border py-4">
              {info.applicant?.avatar && (
                <img
                  src={info.applicant.avatar}
                  alt={info.applicant?.name || info.applicant?.username || "Applicant"}
                  loading="lazy"
                  width={48}
                  height={48}
                  className="h-10 w-10 rounded-lg object-cover"
                />
              )}
              <div className="min-w-0">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Reviewing
                </p>
                <p className="mt-0.5 text-sm font-semibold text-foreground">
                  {info.applicant?.name ||
                    info.applicant?.username ||
                    "The applicant"}
                </p>
              </div>
            </div>

            <div className="mt-8">
              {submitted ? (
                <aside className="flex flex-col gap-2 border-y border-foreground py-5">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground">
                    Submitted
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your review is live and now appears on the applicant's
                    profile.
                  </p>
                </aside>
              ) : (
                <>
                  <ReviewForm
                    onSubmit={handleSubmit}
                    busy={submitting}
                    submitLabel="Submit review"
                  />
                  {submitError && (
                    <p className="mt-4 text-sm text-destructive">{submitError}</p>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
