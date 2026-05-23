import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TopNav } from "@/components/nav/TopNav";
import { Footer } from "@/components/nav/Footer";
import { SearchBar } from "@/components/search/SearchBar";
import { ProviderCard } from "@/components/cards/ProviderCard";
import { NeedCard } from "@/components/cards/NeedCard";
import { ProviderCardSkeleton } from "@/components/common/ProviderCardSkeleton";
import { providers, needs } from "@/lib/mockData";
import { ArrowRight, BadgeCheck, Globe2, MapPin, ShieldCheck, Sparkles, Users, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Needool - Find trusted skills, near you or worldwide" },
      { name: "description", content: "Discover and hire verified providers across skills, services, and products. Local search with worldwide reach." },
      { property: "og:title", content: "Needool - Global skills directory" },
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
    <div className="needool-shell min-h-screen bg-background">
      <TopNav />

      <section className="relative overflow-hidden border-b border-border bg-sidebar/82">
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:py-14 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="max-w-3xl">
            <span className="trust-chip">
              <Sparkles className="h-3.5 w-3.5 text-accent" /> Nigeria soft launch - global provider directory
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] text-foreground sm:text-6xl">
              Search skills, services, and providers with <span className="text-primary">trust built in.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Needool helps people find active professionals, businesses, opportunities, events, and hiring paths from Lagos to anywhere.
            </p>
            <div className="mt-7 max-w-3xl">
              <SearchBar variant="hero" />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="trust-chip"><Globe2 className="h-3.5 w-3.5 text-primary" /> Worldwide, country, city, near me</span>
              <span className="trust-chip"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Active-first ranking</span>
              <span className="trust-chip"><Zap className="h-3.5 w-3.5 text-accent" /> Free to browse</span>
            </div>
          </div>

          <div className="surface-elevated grid gap-3 rounded-lg p-4">
            {[
              { label: "Active providers", value: "8,420", icon: BadgeCheck, hint: "Ranked above inactive listings" },
              { label: "Need Requests", value: "1,280", icon: Users, hint: "People asking providers to come to them" },
              { label: "Countries covered", value: "42", icon: Globe2, hint: "Built for local density and global access" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-md border border-border bg-secondary/80 p-4">
                <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/15 text-primary"><item.icon className="h-5 w-5" /></div>
                <div>
                  <div className="text-2xl font-extrabold text-foreground">{item.value}</div>
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{item.hint}</div>
                </div>
              </div>
            ))}
            <div className="rounded-md border border-primary/25 bg-primary/10 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground"><MapPin className="h-4 w-4 text-primary" /> Lagos-first launch signal</div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">Designed for provider density in Lagos first, then Abuja, Port Harcourt, and global discovery.</p>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl space-y-14 px-4 py-12">
        <section>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground sm:text-2xl">Top providers near you</h2>
              <p className="text-sm text-muted-foreground">Active, verified, and ready to work.</p>
            </div>
            <Link to="/search" className="hidden items-center gap-1 rounded-md text-sm font-semibold text-primary hover:gap-2 sm:inline-flex">
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
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground sm:text-2xl">Recent Need Requests</h2>
              <p className="text-sm text-muted-foreground">Open jobs from people and businesses nearby.</p>
            </div>
            <Link to="/needs" className="hidden items-center gap-1 rounded-md text-sm font-semibold text-primary hover:gap-2 sm:inline-flex">
              See all needs <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
            {needs.slice(0, 6).map((n) => <NeedCard key={n.id} n={n} />)}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
