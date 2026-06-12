// PRD §4 — Search & discovery. Live results from /api/search merged with
// mockData fallback for legacy demo profiles. Visitor-safe — server already
// strips contact info per §4.3.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { TopNav } from "@/components/nav/TopNav";
import { Footer } from "@/components/nav/Footer";
import { ProviderCard } from "@/components/cards/ProviderCard";
import { ProviderCardSkeleton } from "@/components/common/ProviderCardSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterSidebar, type Filters } from "@/components/search/FilterSidebar";
import { providers, type Provider } from "@/lib/mockData";
import { apiFetch } from "@/lib/api";
import { SlidersHorizontal, X } from "lucide-react";

interface SearchParams {
  q?: string;
  scope?: "worldwide" | "country" | "state" | "city" | "near";
  country?: string;
  state?: string;
  city?: string;
  lat?: number;
  lng?: number;
  radius?: number;
}

type SearchResult = {
  id: string;
  username: string;
  name: string;
  avatar?: string;
  accountType: "Individual" | "Business";
  status: "active" | "inactive" | "restricted" | "banned";
  bio: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  distanceKm: number | null;
};

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>): SearchParams => {
    const out: SearchParams = {};
    if (typeof s.q === "string") out.q = s.q;
    if (typeof s.scope === "string" && ["worldwide", "country", "state", "city", "near"].includes(s.scope)) {
      out.scope = s.scope as SearchParams["scope"];
    }
    for (const k of ["country", "state", "city"] as const) {
      if (typeof s[k] === "string") out[k] = s[k] as string;
    }
    for (const k of ["lat", "lng", "radius"] as const) {
      if (typeof s[k] === "number") out[k] = s[k] as number;
      else if (typeof s[k] === "string" && Number.isFinite(Number(s[k]))) out[k] = Number(s[k]);
    }
    return out;
  },
  head: () => ({
    meta: [
      { title: "Search providers — Needool" },
      { name: "description", content: "Filter and find skilled providers by location, account type, and availability." },
    ],
  }),
  component: SearchPage,
});

// PRD §4.3 — convert a public search result into the legacy Provider shape
// the existing UI cards expect. Missing fields fall back to safe defaults.
function resultToProvider(r: SearchResult): Provider {
  return {
    id: r.id,
    username: r.username,
    name: r.name,
    avatar: r.avatar || `https://i.pravatar.cc/200?u=${encodeURIComponent(r.username)}`,
    accountType: r.accountType === "Business" ? "Business" : "Individual",
    status: r.status === "active" ? "active" : "inactive",
    country: r.country ?? "",
    state: r.state ?? "",
    city: r.city ?? "",
    distanceKm: r.distanceKm ?? 0,
    skills: [],
    services: [],
    hourlyRate: 0,
    currency: "USD",
    workHours: "Not provided",
    remote: false,
    bio: r.bio ?? "",
    links: [],
    cvUrl: "#",
    followers: 0,
    following: 0,
    verified: false,
  };
}

function SearchPage() {
  const params = Route.useSearch();
  const q = params.q ?? "";
  const scope = params.scope ?? "worldwide";
  const [filters, setFilters] = useState<Filters>({ scope: "Worldwide", accountTypes: [], remoteOnly: false });
  const [showFilters, setShowFilters] = useState(false);
  const [live, setLive] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    qs.set("scope", scope);
    for (const k of ["country", "state", "city"] as const) {
      if (params[k]) qs.set(k, String(params[k]));
    }
    if (scope === "near") {
      if (params.lat != null) qs.set("lat", String(params.lat));
      if (params.lng != null) qs.set("lng", String(params.lng));
      if (params.radius != null) qs.set("radius", String(params.radius));
    }
    setLoading(true);
    setError(null);
    apiFetch<{ data: { results: SearchResult[] } }>(`/api/search?${qs.toString()}`)
      .then((r) => setLive(r.data.results))
      .catch((e) => { setError(e instanceof Error ? e.message : "Search failed."); setLive([]); })
      .finally(() => setLoading(false));
  }, [q, scope, params.country, params.state, params.city, params.lat, params.lng, params.radius]);

  const filteredMock = useMemo(() => {
    return providers.filter((p) => {
      if (filters.accountTypes.length && !filters.accountTypes.includes(p.accountType)) return false;
      if (filters.remoteOnly && !p.remote) return false;
      if (q && !(p.name + p.skills.join(" ") + p.bio).toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [filters, q]);

  // Merge: live results first (de-duped by username), mock fills the rest.
  const liveProviders = (live ?? []).map(resultToProvider);
  const liveUsernames = new Set(liveProviders.map((p) => p.username));
  const merged = [...liveProviders, ...filteredMock.filter((p) => !liveUsernames.has(p.username))];

  const active = merged.filter((p) => p.status === "active");
  const inactive = merged.filter((p) => p.status === "inactive");

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <header className="mb-8 border-t-2 border-foreground pt-6">
          <div className="flex items-baseline justify-between gap-3">
            <div className="flex items-baseline gap-4">
              <span className="font-mono text-sm font-semibold tracking-[0.16em] text-foreground">
                {String(merged.length).padStart(3, "0")}
              </span>
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Results
              </span>
              <span
                className="hidden font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground sm:inline"
                data-test="search-summary"
              >
                {scope === "worldwide" ? "Worldwide" : `Scope ${scope}`}
              </span>
            </div>
            <button
              onClick={() => setShowFilters(true)}
              className="lg:hidden inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary"
            >
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </button>
          </div>
          <h1 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            {q ? `Results for "${q}"` : "Browse providers"}
          </h1>
        </header>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <div className="hidden lg:block">
            <FilterSidebar value={filters} onChange={setFilters} />
          </div>

          {showFilters && (
            <div className="lg:hidden fixed inset-0 z-50">
              <div
                className="absolute inset-0 bg-black/60"
                onClick={() => setShowFilters(false)}
              />
              <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] overflow-y-auto border-l border-border bg-background p-5">
                <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                  <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/85">
                    Refine
                  </h3>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    aria-label="Close filters"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <FilterSidebar value={filters} onChange={setFilters} />
              </div>
            </div>
          )}

          <div className="min-w-0 space-y-8">
            {loading ? (
              <div data-test="search-loading" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <ProviderCardSkeleton key={i} />)}
              </div>
            ) : error ? (
              <p
                data-test="search-error"
                className="border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
              >
                {error}
              </p>
            ) : merged.length === 0 ? (
              <EmptyState title="No providers match" description="Try widening your scope or removing filters." />
            ) : (
              <>
                <section data-test="search-active-section">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground">
                      Active providers
                      <span className="ml-2 text-muted-foreground">{active.length}</span>
                    </h2>
                  </div>
                  {active.length ? (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-test="search-active-grid">
                      {active.map((p) => <ProviderCard key={p.id} p={p} />)}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No active providers in this filter.</p>
                  )}
                </section>

                {inactive.length > 0 && (
                  <section data-test="search-inactive-section">
                    <div className="mb-4 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/60" />
                      <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground">
                        Inactive providers
                        <span className="ml-2 text-muted-foreground">{inactive.length}</span>
                      </h2>
                    </div>
                    <p className="mb-3 text-xs text-muted-foreground">
                      These accounts aren't currently available. You can request a notification when they reactivate.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {inactive.map((p) => <ProviderCard key={p.id} p={p} />)}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
