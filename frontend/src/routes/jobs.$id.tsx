import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { TopNav } from "@/components/nav/TopNav";
import { Footer } from "@/components/nav/Footer";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, ApiError } from "@/lib/api";
import { ArrowLeft, MapPin } from "lucide-react";

type Question = { id: string; position: number; prompt: string; description?: string | null };

type JobOpening = {
  id: string;
  title: string;
  employment_type?: string;
  eligible_account_type?: string;
  eligible_locations?: string[];
  description?: string;
  application_instructions?: string;
  pinned?: boolean;
  status?: string;
  questions: Question[];
};

export const Route = createFileRoute("/jobs/$id")({
  head: ({ params }) => ({ meta: [{ title: `Job ${params.id} - Needool` }] }),
  component: JobDetail,
});

function JobDetail() {
  const { id } = Route.useParams();
  const { user, state, getToken } = useAuth();
  const navigate = useNavigate();
  const [opening, setOpening] = useState<JobOpening | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch<{ data: JobOpening }>(`/api/jobs/${encodeURIComponent(id)}`)
      .then((r) => {
        if (!cancelled) {
          setOpening(r.data);
          setLoadError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || "Failed to load opening.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  function onApply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!opening) return;
    if (state !== "active") {
      setSubmitError("Activate your subscription to apply.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const fd = new FormData(event.currentTarget);
    const answers = opening.questions.map((q) => ({
      question_id: q.id,
      answer: String(fd.get(`q_${q.id}`) || ""),
    }));
    apiFetch<{ data: { id: string } }>(`/api/jobs/${encodeURIComponent(opening.id)}/apply`, {
      method: "POST",
      getToken,
      body: JSON.stringify({ answers }),
    })
      .then(() => setSubmitted(true))
      .catch((err) => {
        setSubmitError(err instanceof ApiError ? err.message : "Could not submit application.");
      })
      .finally(() => setSubmitting(false));
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <Link
          to="/jobs"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to openings
        </Link>

        {loading && (
          <div className="mt-8 border border-dashed border-border p-10 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Loading
          </div>
        )}
        {loadError && !loading && (
          <div className="mt-8 border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
            {loadError}
          </div>
        )}
        {!loading && opening && (
          <article className="mt-8 space-y-10">
            <header className="border-t-2 border-foreground pt-6">
              <div className="flex items-baseline gap-4">
                <span
                  aria-hidden
                  className="font-mono text-sm font-semibold tracking-[0.16em] text-foreground"
                >
                  01
                </span>
                <span className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-foreground/85">
                  Job
                </span>
                <span className="font-mono text-xs uppercase tracking-[0.22em] text-foreground/65">
                  {opening.employment_type || "Remote"}
                </span>
              </div>
              <h1 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                {opening.title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {opening.eligible_account_type &&
                  opening.eligible_account_type !== "Both" && (
                    <>
                      <span className="text-foreground/80">
                        {opening.eligible_account_type} only
                      </span>
                      {(opening.eligible_locations ?? []).length > 0 && (
                        <span aria-hidden className="h-3 w-px bg-border" />
                      )}
                    </>
                  )}
                {(opening.eligible_locations ?? []).map((loc, i) => (
                  <span key={loc} className="inline-flex items-center gap-1">
                    {i > 0 && (
                      <span aria-hidden className="text-muted-foreground/60">
                        &middot;
                      </span>
                    )}
                    <MapPin className="h-3 w-3" /> {loc}
                  </span>
                ))}
              </div>
            </header>

            {opening.description && (
              <p className="max-w-prose whitespace-pre-line text-base leading-[1.75] text-foreground">
                {opening.description}
              </p>
            )}

            {opening.application_instructions && (
              <section className="border-y border-border py-5">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/80">
                  Application instructions
                </p>
                <p className="mt-2 text-sm leading-7 text-foreground">
                  {opening.application_instructions}
                </p>
              </section>
            )}

            {submitted ? (
              <aside className="flex flex-col gap-2 border-y border-foreground py-5">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground">
                  Submitted
                </p>
                <p className="text-sm text-muted-foreground">
                  Track its status under{" "}
                  <Link
                    to="/dashboard/applications"
                    className="font-semibold text-foreground underline underline-offset-4"
                  >
                    My applications
                  </Link>
                  .
                </p>
              </aside>
            ) : (
              <form onSubmit={onApply} className="space-y-6">
                <header className="border-t-2 border-foreground pt-6">
                  <div className="flex items-baseline gap-4">
                    <span
                      aria-hidden
                      className="font-mono text-sm font-semibold tracking-[0.16em] text-foreground"
                    >
                      02
                    </span>
                    <span className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-foreground/85">
                      Apply
                    </span>
                  </div>
                  <h2 className="mt-4 font-heading text-xl font-bold tracking-tight text-foreground">
                    Apply for this role.
                  </h2>
                </header>

                {!user && (
                  <p className="text-sm text-muted-foreground">
                    <Link
                      to="/login"
                      className="font-semibold text-foreground underline underline-offset-4"
                    >
                      Sign in
                    </Link>{" "}
                    to apply.
                  </p>
                )}
                {user && state !== "active" && (
                  <p className="text-sm text-muted-foreground">
                    Active subscribers with a complete profile can apply.{" "}
                    <Link
                      to="/pricing"
                      className="font-semibold text-foreground underline underline-offset-4"
                    >
                      See pricing
                    </Link>
                    .
                  </p>
                )}

                {opening.questions.map((q, i) => (
                  <label key={q.id} className="block">
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/80">
                      Q{String(i + 1).padStart(2, "0")} &middot; {q.prompt}
                      <span className="ml-1 text-destructive">*</span>
                    </span>
                    {q.description && (
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        {q.description}
                      </span>
                    )}
                    <textarea
                      name={`q_${q.id}`}
                      required
                      rows={3}
                      className="mt-2 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </label>
                ))}

                {submitError && (
                  <p className="text-sm text-destructive">{submitError}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting || !user || state !== "active"}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-foreground px-5 py-3 text-sm font-bold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Submitting…" : "Submit application"}
                </button>
              </form>
            )}
          </article>
        )}
      </main>
      <Footer />
    </div>
  );
}
