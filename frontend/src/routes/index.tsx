import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TopNav } from "@/components/nav/TopNav";
import { Footer } from "@/components/nav/Footer";
import { SearchBar } from "@/components/search/SearchBar";
import { ProviderCard } from "@/components/cards/ProviderCard";
import { NeedCard } from "@/components/cards/NeedCard";
import { ProviderCardSkeleton } from "@/components/common/ProviderCardSkeleton";
import { providers, needs } from "@/lib/mockData";
import { ArrowRight, BadgeCheck, Globe2, ShieldCheck, Sparkles, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Needool — Find trusted skills, near you or worldwide" },
      { name: "description", content: "Discover and hire verified providers across skills, services, and products. Local search with worldwide reach." },
      { property: "og:title", content: "Needool — Global skills directory" },
      { property: "og:description", content: "Discover and hire verified providers worldwide." },
    ],
  }),
  component: Home,
});

function Home() {
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);
  const topProviders = providers.filter((p) => p.status === "active").slice(0, 8);

  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      <section className="relative overflow-hidden border-b border-border bg-sidebar">
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> 12,000+ verified providers worldwide
          </span>
          <h1 className="mt-5 text-3xl sm:text-5xl font-extrabold text-foreground">
            Find the right skill, <span className="text-primary">right where you need it.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg text-muted-foreground">
            Needool is a global directory of skilled people, businesses, and non-profits — searchable from your neighborhood to the whole planet.
          </p>
          <div className="mt-7 max-w-3xl">
            <SearchBar variant="hero" />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Globe2 className="h-3.5 w-3.5" /> Search any scope</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Verified hires & reviews</span>
            <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Free to browse</span>
          </div>
          </div>
          <div className="grid gap-3 rounded-lg border border-border bg-card p-4 shadow-2xl shadow-black/20">
            {[
              { label: "Active providers", value: "8,420", icon: BadgeCheck },
              { label: "Need Requests", value: "1,280", icon: Users },
              { label: "Countries covered", value: "42", icon: Globe2 },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-md bg-secondary p-4">
                <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/15 text-primary"><item.icon className="h-5 w-5" /></div>
                <div>
                  <div className="text-2xl font-extrabold text-foreground">{item.value}</div>
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-12 space-y-14">
        <section>
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">Top providers near you</h2>
              <p className="text-sm text-muted-foreground">Active, verified, and ready to work.</p>
            </div>
            <Link to="/search" className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-primary hover:gap-2 transition-all">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <ProviderCardSkeleton key={i} />)
              : topProviders.map((p) => <ProviderCard key={p.id} p={p} />)}
          </div>
        </section>

        <section>
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">Recent Need Requests</h2>
              <p className="text-sm text-muted-foreground">Open jobs from people and businesses nearby.</p>
            </div>
            <Link to="/search" className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-primary hover:gap-2 transition-all">
              See all needs <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-x-auto sm:overflow-visible -mx-4 px-4 sm:mx-0 sm:px-0 pb-2">
            {needs.slice(0, 6).map((n) => <NeedCard key={n.id} n={n} />)}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
