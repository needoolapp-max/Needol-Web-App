import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";

type Application = {
  id: string;
  job_opening_id: string;
  status: string;
  score?: number | null;
  created_at?: string;
  snapshot?: { name?: string };
};

type VerifiedHire = {
  id: string;
  job_opening_id: string;
  employer_name?: string;
  reviewer_unlock_at?: string;
  review_window_end_at?: string;
};

export const Route = createFileRoute("/dashboard/applications")({
  head: () => ({ meta: [{ title: "My Applications - Needool" }] }),
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const { getToken } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [hires, setHires] = useState<VerifiedHire[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiFetch<{ data: Application[] }>("/api/me/applications", { getToken }),
      apiFetch<{ data: VerifiedHire[] }>("/api/me/verified-hires", { getToken }),
    ])
      .then(([a, h]) => {
        if (cancelled) return;
        setApps(a.data || []);
        setHires(h.data || []);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground">My applications</h1>
        <p className="mt-2 text-sm text-muted-foreground">Track your job applications and Verified Hire reviews.</p>

        <section className="mt-8">
          <h2 className="text-base font-semibold text-foreground">Applications</h2>
          {loading && <p className="mt-3 text-sm text-muted-foreground">Loading…</p>}
          {!loading && apps.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">No applications yet. Browse <Link to="/jobs" className="font-semibold text-primary underline">open roles</Link>.</p>
          )}
          <ul className="mt-3 space-y-3">
            {apps.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Application {a.id.slice(0, 8)}…</p>
                  <p className="text-xs text-muted-foreground">
                    Submitted {a.created_at ? new Date(a.created_at).toLocaleDateString() : "—"} · Status: <strong>{a.status}</strong>
                    {a.score != null && <> · Score: {a.score}</>}
                  </p>
                </div>
                <Link
                  to="/jobs/$id"
                  params={{ id: a.job_opening_id }}
                  className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                >
                  View role
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-base font-semibold text-foreground">Verified Hires</h2>
          {!loading && hires.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">Once an admin marks you as Hired, the link to leave a review will appear here.</p>
          )}
          <ul className="mt-3 space-y-3">
            {hires.map((h) => {
              const unlocked = h.reviewer_unlock_at ? new Date(h.reviewer_unlock_at) < new Date() : true;
              return (
                <li key={h.id} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Hire by {h.employer_name || "employer"}</p>
                    <p className="text-xs text-muted-foreground">
                      {unlocked
                        ? "Review window open"
                        : `Review unlocks ${h.reviewer_unlock_at ? new Date(h.reviewer_unlock_at).toLocaleDateString() : ""}`}
                    </p>
                  </div>
                  <Link
                    to="/reviews/$verifiedHireId"
                    params={{ verifiedHireId: h.id }}
                    className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    Leave review
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
  );
}
