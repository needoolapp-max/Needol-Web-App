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
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link to="/jobs" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to openings
        </Link>

        {loading && (
          <div className="mt-8 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        )}
        {loadError && !loading && (
          <div className="mt-8 rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
            {loadError}
          </div>
        )}
        {!loading && opening && (
          <article className="mt-8 space-y-6">
            <header>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">{opening.employment_type || "Remote"}</p>
              <h1 className="mt-2 text-3xl font-extrabold text-foreground sm:text-4xl">{opening.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {opening.eligible_account_type && opening.eligible_account_type !== "Both" && (
                  <span className="rounded-full bg-muted px-2.5 py-1 font-medium">
                    {opening.eligible_account_type} only
                  </span>
                )}
                {(opening.eligible_locations ?? []).map((loc) => (
                  <span key={loc} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-medium">
                    <MapPin className="h-3 w-3" /> {loc}
                  </span>
                ))}
              </div>
            </header>

            {opening.description && (
              <div className="whitespace-pre-line rounded-2xl border border-border bg-card p-6 text-sm leading-7 text-foreground">
                {opening.description}
              </div>
            )}

            {opening.application_instructions && (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-sm text-foreground">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Application instructions</p>
                <p className="mt-2">{opening.application_instructions}</p>
              </div>
            )}

            {submitted ? (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
                <h2 className="text-lg font-bold text-foreground">Application submitted</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Track its status under <Link to="/dashboard/applications" className="font-semibold text-primary underline">My applications</Link>.
                </p>
              </div>
            ) : (
              <form onSubmit={onApply} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
                <h2 className="text-base font-bold text-foreground">Apply for this role</h2>
                {!user && (
                  <p className="text-sm text-muted-foreground">
                    <Link to="/login" className="font-semibold text-primary underline">Sign in</Link> to apply.
                  </p>
                )}
                {user && state !== "active" && (
                  <p className="text-sm text-muted-foreground">
                    Active subscribers with a complete profile can apply. <Link to="/pricing" className="font-semibold text-primary underline">See pricing</Link>.
                  </p>
                )}
                {opening.questions.map((q) => (
                  <label key={q.id} className="flex flex-col gap-1.5 text-left">
                    <span className="text-sm font-medium text-foreground">
                      {q.prompt}
                      <span className="ml-1 text-destructive">*</span>
                    </span>
                    {q.description && (
                      <span className="text-xs text-muted-foreground">{q.description}</span>
                    )}
                    <textarea
                      name={`q_${q.id}`}
                      required
                      rows={3}
                      className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    />
                  </label>
                ))}
                {submitError && <p className="text-sm text-destructive">{submitError}</p>}
                <button
                  type="submit"
                  disabled={submitting || !user || state !== "active"}
                  className="mt-2 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
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
