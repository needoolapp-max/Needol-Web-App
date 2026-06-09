// PRD §8.6 + §18.2 — employer reviewer-only persistent account surface.
// Authenticated entirely by the magic-link token. No Clerk required; the
// employer cannot subscribe, post, or apply — they can only review and
// view the hires accessible via this token.

import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { TopNav } from "@/components/nav/TopNav";
import { Footer } from "@/components/nav/Footer";
import { apiFetch, ApiError } from "@/lib/api";

type EmployerHire = {
  id: string;
  jobOpeningId: string | null;
  employerName: string | null;
  reviewerUnlockAt: string;
  reviewWindowEndAt: string;
  createdAt: string;
  reviewToken: string | null;
  applicant: { id?: string; username?: string; name?: string; avatar?: string } | null;
  employerReviewSubmitted: boolean;
  employerReview: { rating: number; comment: string | null; createdAt: string } | null;
};

type EmployerAccount = {
  employer: { email: string | null; name: string | null; accountCreatedAt: string | null; lastSeenAt: string | null };
  verifiedHires: EmployerHire[];
};

export const Route = createFileRoute("/employer/$token")({
  head: () => ({ meta: [{ title: "Employer dashboard - Needool" }] }),
  component: EmployerAccountPage,
});

function formatDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function EmployerAccountPage() {
  const { token } = Route.useParams();
  const [account, setAccount] = useState<EmployerAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ data: EmployerAccount }>(
      `/api/employer/me?token=${encodeURIComponent(token)}`,
    )
      .then((r) => {
        if (!cancelled) setAccount(r.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Token not recognized.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-3xl px-4 py-10" data-test="employer-dashboard">
        <h1 className="text-3xl font-extrabold text-foreground">Employer dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A reviewer-only Needool surface. You can review the applicants you've hired through Needool here.
          You can't post, apply, or subscribe — to do that, sign up for a full Needool account.
        </p>
        {loading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="mt-6 text-sm text-destructive" data-test="employer-error">{error}</p>}
        {account && (
          <>
            <section className="mt-6 rounded-2xl border border-border bg-card p-4">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Employer</dt>
                  <dd className="text-foreground">{account.employer.name || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</dt>
                  <dd className="text-foreground" data-test="employer-email">{account.employer.email || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account opened</dt>
                  <dd className="text-foreground">{formatDate(account.employer.accountCreatedAt) || "Just now"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last seen</dt>
                  <dd className="text-foreground">{formatDate(account.employer.lastSeenAt) || "Just now"}</dd>
                </div>
              </dl>
            </section>

            <h2 className="mt-8 text-lg font-bold text-foreground">Your Needool hires</h2>
            {account.verifiedHires.length === 0 && (
              <p className="mt-2 text-sm text-muted-foreground">No verified hires linked to this token yet.</p>
            )}
            <ul className="mt-3 flex flex-col gap-3">
              {account.verifiedHires.map((vh) => {
                const unlocked = vh.reviewerUnlockAt
                  ? new Date(vh.reviewerUnlockAt).getTime() <= Date.now()
                  : false;
                const closed = vh.reviewWindowEndAt
                  ? new Date(vh.reviewWindowEndAt).getTime() < Date.now()
                  : false;
                return (
                  <li
                    key={vh.id}
                    data-test="employer-hire-row"
                    className="rounded-2xl border border-border bg-card p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {vh.applicant?.name || vh.applicant?.username || "Applicant"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Hired {formatDate(vh.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {vh.employerReviewSubmitted ? (
                          <span data-test="employer-hire-reviewed" className="rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
                            Review submitted ({vh.employerReview?.rating}★)
                          </span>
                        ) : closed ? (
                          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                            Review window closed
                          </span>
                        ) : !unlocked ? (
                          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                            Unlocks {formatDate(vh.reviewerUnlockAt)}
                          </span>
                        ) : vh.reviewToken ? (
                          <Link
                            to="/review-employer/$token"
                            params={{ token: vh.reviewToken }}
                            data-test="employer-hire-review-cta"
                            className="inline-flex min-h-9 items-center justify-center rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                          >
                            Leave a review
                          </Link>
                        ) : (
                          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                            Use the original magic-link to review
                          </span>
                        )}
                      </div>
                    </div>
                    {vh.applicant?.username && (
                      <Link
                        to="/p/$username"
                        params={{ username: vh.applicant.username }}
                        className="mt-2 inline-block text-xs text-primary hover:underline"
                      >
                        View applicant profile
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
