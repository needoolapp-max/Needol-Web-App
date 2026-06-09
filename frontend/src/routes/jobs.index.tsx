import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { TopNav } from "@/components/nav/TopNav";
import { Footer } from "@/components/nav/Footer";
import { GlowCard } from "@/components/ui/spotlight-card";
import { apiFetch } from "@/lib/api";
import { ArrowRight, Briefcase, Send } from "lucide-react";

type JobOpening = {
  id: string;
  title: string;
  employment_type?: string;
  eligible_account_type?: string;
  eligible_locations?: string[];
  description?: string;
  pinned?: boolean;
  created_at?: string;
  questions?: Array<{ id: string; prompt: string }>;
};

export const Route = createFileRoute("/jobs/")({
  head: () => ({ meta: [{ title: "Job Openings - Needool" }] }),
  component: JobsIndex,
});

function JobsIndex() {
  const [items, setItems] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ data: JobOpening[] }>("/api/jobs")
      .then((r) => {
        if (!cancelled) {
          setItems(r.data || []);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load openings.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Needool · Job Openings</p>
                <h1 className="mt-2 text-3xl font-extrabold text-foreground sm:text-4xl">Open roles</h1>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Roles published by Needool's hiring service. Active members with a complete profile and matching eligibility can apply.
                </p>
              </div>
              <Link
                to="/jobs/hire-request"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Send className="h-4 w-4" />
                Submit a hire request
              </Link>
            </div>

            {loading && (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                Loading…
              </div>
            )}
            {error && !loading && (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
                {error}
              </div>
            )}
            {!loading && !error && items.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                No open roles right now. Check back soon.
              </div>
            )}
            {!loading && !error && items.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                {items.map((job) => (
                  <GlowCard key={job.id} customSize className="flex flex-col rounded-2xl p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          {job.employment_type || "Remote"}
                        </p>
                        <h2 className="mt-1 text-lg font-bold text-foreground">{job.title}</h2>
                      </div>
                      {job.pinned && (
                        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                          Featured
                        </span>
                      )}
                    </div>
                    {job.description && (
                      <p className="mt-3 line-clamp-4 text-sm leading-6 text-foreground/80">{job.description}</p>
                    )}
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {job.eligible_account_type && job.eligible_account_type !== "Both" && (
                        <span className="rounded-full bg-muted px-2.5 py-1 font-medium">
                          {job.eligible_account_type} only
                        </span>
                      )}
                      {(job.eligible_locations ?? []).slice(0, 2).map((loc) => (
                        <span key={loc} className="rounded-full bg-muted px-2.5 py-1 font-medium">
                          {loc}
                        </span>
                      ))}
                      {(job.questions?.length ?? 0) > 0 && (
                        <span className="rounded-full bg-muted px-2.5 py-1 font-medium">
                          {job.questions!.length} screening Q
                        </span>
                      )}
                    </div>
                    <Link
                      to="/jobs/$id"
                      params={{ id: job.id }}
                      className="mt-4 inline-flex items-center gap-1.5 self-start rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      View & apply <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </GlowCard>
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <GlowCard customSize className="rounded-2xl p-5">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Briefcase className="h-4 w-4 text-primary" />
                Hiring with Needool
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Employers can post a hire request starting at $500. Needool curates the opening, screens applicants, and ships you a shortlist.
              </p>
            </GlowCard>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
