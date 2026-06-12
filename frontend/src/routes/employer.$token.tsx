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
      <main
        className="mx-auto max-w-3xl px-4 py-12"
        data-test="employer-dashboard"
      >
        {/* Editorial masthead */}
        <header className="border-t-2 border-foreground pt-6">
          <div className="flex items-baseline gap-4">
            <span
              aria-hidden
              className="font-mono text-sm font-semibold tracking-[0.16em] text-foreground"
            >
              01
            </span>
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-foreground/85">
              Employer
            </span>
          </div>
          <h1 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Employer dashboard.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
            A reviewer-only Needool surface. You can review the applicants
            you've hired through Needool here. You can't post, apply, or
            subscribe — to do that, sign up for a full Needool account.
          </p>
        </header>

        {loading && (
          <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Loading
          </p>
        )}
        {error && (
          <p
            className="mt-8 text-sm text-destructive"
            data-test="employer-error"
          >
            {error}
          </p>
        )}

        {account && (
          <>
            {/* Identity ledger */}
            <dl className="mt-10 grid divide-y divide-border border-y border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <EmployerCell
                label="Employer"
                value={account.employer.name || "—"}
              />
              <EmployerCell
                label="Email"
                value={account.employer.email || "—"}
                dataTest="employer-email"
              />
              <EmployerCell
                label="Account opened"
                value={formatDate(account.employer.accountCreatedAt) || "Just now"}
              />
              <EmployerCell
                label="Last seen"
                value={formatDate(account.employer.lastSeenAt) || "Just now"}
              />
            </dl>

            {/* Hires section */}
            <section className="mt-12 border-t-2 border-foreground pt-6">
              <header className="mb-5 flex items-baseline justify-between gap-4">
                <div className="flex items-baseline gap-4">
                  <span
                    aria-hidden
                    className="font-mono text-sm font-semibold tracking-[0.16em] text-foreground"
                  >
                    02
                  </span>
                  <span className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-foreground/85">
                    Hires
                  </span>
                </div>
                <span className="font-mono text-[11px] font-semibold tracking-[0.16em] text-foreground/70">
                  {String(account.verifiedHires.length).padStart(2, "0")}
                </span>
              </header>

              {account.verifiedHires.length === 0 ? (
                <p className="border border-dashed border-border p-6 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  No verified hires linked to this token yet
                </p>
              ) : (
                <ul className="divide-y divide-border border-y border-border">
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
                        className="grid grid-cols-1 gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-center"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">
                            {vh.applicant?.name ||
                              vh.applicant?.username ||
                              "Applicant"}
                          </p>
                          <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                            Hired {formatDate(vh.createdAt)}
                            {vh.applicant?.username && (
                              <>
                                <span aria-hidden className="mx-2">
                                  &middot;
                                </span>
                                <Link
                                  to="/p/$username"
                                  params={{ username: vh.applicant.username }}
                                  className="text-foreground underline underline-offset-4"
                                >
                                  View profile
                                </Link>
                              </>
                            )}
                          </p>
                        </div>
                        <div className="sm:text-right">
                          {vh.employerReviewSubmitted ? (
                            <span
                              data-test="employer-hire-reviewed"
                              className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-success"
                            >
                              Review submitted ({vh.employerReview?.rating}&star;)
                            </span>
                          ) : closed ? (
                            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              Review window closed
                            </span>
                          ) : !unlocked ? (
                            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              Unlocks {formatDate(vh.reviewerUnlockAt)}
                            </span>
                          ) : vh.reviewToken ? (
                            <Link
                              to="/review-employer/$token"
                              params={{ token: vh.reviewToken }}
                              data-test="employer-hire-review-cta"
                              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-foreground px-4 py-2 text-sm font-bold text-background transition-opacity hover:opacity-90"
                            >
                              Leave a review
                            </Link>
                          ) : (
                            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              Use the original magic-link
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function EmployerCell({
  label,
  value,
  dataTest,
}: {
  label: string;
  value: string;
  dataTest?: string;
}) {
  return (
    <div className="flex flex-col gap-1 px-1 py-4 sm:px-5 sm:py-5">
      <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/70">
        {label}
      </dt>
      <dd className="text-sm font-semibold text-foreground" data-test={dataTest}>
        {value}
      </dd>
    </div>
  );
}
