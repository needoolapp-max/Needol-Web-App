import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { TopNav } from "@/components/nav/TopNav";
import { Footer } from "@/components/nav/Footer";
import { ProviderCard } from "@/components/cards/ProviderCard";
import { ProviderCardSkeleton } from "@/components/common/ProviderCardSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterSidebar, type Filters } from "@/components/search/FilterSidebar";
import { providers } from "@/lib/mockData";
import { SlidersHorizontal, X } from "lucide-react";

interface SearchParams { q?: string }

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({ q: typeof s.q === "string" ? s.q : "" }),
  head: () => ({
    meta: [
      { title: "Search providers — Needool" },
      { name: "description", content: "Filter and find skilled providers by location, account type, and availability." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q = "" } = Route.useSearch();
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ scope: "Worldwide", accountTypes: [], remoteOnly: false });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { const t = setTimeout(() => setLoading(false), 500); return () => clearTimeout(t); }, []);

  const filtered = useMemo(() => {
    return providers.filter((p) => {
      if (filters.accountTypes.length && !filters.accountTypes.includes(p.accountType)) return false;
      if (filters.remoteOnly && !p.remote) return false;
      if (q && !(p.name + p.skills.join(" ") + p.bio).toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [filters, q]);

  const active = filtered.filter((p) => p.status === "active");
  const inactive = filtered.filter((p) => p.status === "inactive");

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {q ? `Results for "${q}"` : "Browse providers"}
            </h1>
            <p className="text-sm text-muted-foreground">{filtered.length} providers found</p>
          </div>
          <button onClick={() => setShowFilters(true)} className="lg:hidden inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted">
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <div className="hidden lg:block">
            <FilterSidebar value={filters} onChange={setFilters} />
          </div>

          {showFilters && (
            <div className="lg:hidden fixed inset-0 z-50">
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilters(false)} />
              <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-background p-4 overflow-y-auto">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold">Filters</h3>
                  <button onClick={() => setShowFilters(false)} className="rounded-lg p-2 hover:bg-muted"><X className="h-4 w-4" /></button>
                </div>
                <FilterSidebar value={filters} onChange={setFilters} />
              </div>
            </div>
          )}

          <div className="min-w-0 space-y-8">
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <ProviderCardSkeleton key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState title="No providers match" description="Try widening your scope or removing filters." />
            ) : (
              <>
                <section>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Active providers <span className="text-muted-foreground font-normal normal-case">· {active.length}</span></h2>
                  </div>
                  {active.length ? (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {active.map((p) => <ProviderCard key={p.id} p={p} />)}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No active providers in this filter.</p>
                  )}
                </section>

                {inactive.length > 0 && (
                  <section>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/60" />
                      <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Inactive providers <span className="text-muted-foreground font-normal normal-case">· {inactive.length}</span></h2>
                    </div>
                    <p className="mb-3 text-xs text-muted-foreground">These accounts aren't currently available. You can request a notification when they reactivate.</p>
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
