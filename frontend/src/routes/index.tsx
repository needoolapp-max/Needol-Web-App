import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TopNav } from "@/components/nav/TopNav";
import { Footer } from "@/components/nav/Footer";
import { ProviderCard } from "@/components/cards/ProviderCard";
import { NeedCard } from "@/components/cards/NeedCard";
import { ProviderCardSkeleton } from "@/components/common/ProviderCardSkeleton";
import { NeedoolHero } from "@/components/ui/background-paths";
import { providers, needs } from "@/lib/mockData";
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  UserCheck,
} from "lucide-react";

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

const categories = [
  { label: "Technology", icon: "💻" },
  { label: "Design", icon: "🎨" },
  { label: "Marketing", icon: "📣" },
  { label: "Finance", icon: "💰" },
  { label: "Legal", icon: "⚖️" },
  { label: "Health", icon: "🏥" },
  { label: "Education", icon: "📚" },
  { label: "Engineering", icon: "🔧" },
  { label: "Media", icon: "🎬" },
  { label: "Logistics", icon: "🚚" },
];

const steps = [
  {
    num: "1",
    icon: Search,
    title: "Search your need",
    desc: "Type a skill, service, or category. Filter by location, country, or near me — results rank active providers first.",
  },
  {
    num: "2",
    icon: UserCheck,
    title: "Review & connect",
    desc: "Browse verified profiles, ratings, and portfolios. Post a Need Request and let providers come to you.",
  },
  {
    num: "3",
    icon: ShieldCheck,
    title: "Hire with confidence",
    desc: "Every hire is tracked, reviewed, and protected by Needool's trust layer — from quote to completion.",
  },
];

function Home() {
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);
  const topProviders = providers.filter((p) => p.status === "active").slice(0, 8);

  return (
    <div className="needool-shell min-h-screen bg-background">
      <TopNav />

      {/* ── Animated hero ── */}
      <NeedoolHero />

      {/* ── Browse categories ── */}
      <section className="border-b border-border/60 bg-background py-6">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Browse by category</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
            {categories.map((cat) => (
              <Link key={cat.label} to="/search" className="category-pill shrink-0">
                <span>{cat.icon}</span>
                {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl space-y-16 px-4 py-14">

        {/* ── Top Providers ── */}
        <section>
          <div className="mb-6 flex items-end justify-between">
            <div>
              <span className="section-eyebrow"><Star className="h-3 w-3" /> Top Rated</span>
              <h2 className="mt-2 text-xl font-bold text-foreground sm:text-2xl">Top providers near you</h2>
              <p className="mt-1 text-sm text-muted-foreground">Active, verified, and ready to work.</p>
            </div>
            <Link to="/search" className="hidden items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground shadow-sm hover:border-primary hover:text-primary sm:inline-flex">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <ProviderCardSkeleton key={i} />)
              : topProviders.map((p) => <ProviderCard key={p.id} p={p} />)}
          </div>
          <div className="mt-5 sm:hidden">
            <Link to="/search" className="flex items-center justify-center gap-2 rounded-lg border border-border py-3 text-sm font-semibold text-primary">
              View all providers <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* ── How it works ── */}
        <section>
          <div className="mb-8 text-center">
            <span className="section-eyebrow"><Sparkles className="h-3 w-3" /> Simple process</span>
            <h2 className="mt-3 text-2xl font-bold text-foreground sm:text-3xl">How Needool works</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
              From first search to verified hire — in three straightforward steps.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.num} className="step-card">
                <div className="flex items-center gap-3">
                  <span className="step-number">{step.num}</span>
                  <step.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <h3 className="text-base font-bold text-foreground">{step.title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Recent Need Requests ── */}
        <section>
          <div className="mb-6 flex items-end justify-between">
            <div>
              <span className="section-eyebrow"><Trophy className="h-3 w-3" /> Live requests</span>
              <h2 className="mt-2 text-xl font-bold text-foreground sm:text-2xl">Recent Need Requests</h2>
              <p className="mt-1 text-sm text-muted-foreground">Open jobs from people and businesses nearby.</p>
            </div>
            <Link to="/needs" className="hidden items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground shadow-sm hover:border-primary hover:text-primary sm:inline-flex">
              See all needs <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
            {needs.slice(0, 6).map((n) => <NeedCard key={n.id} n={n} />)}
          </div>
        </section>

        {/* ── Quick links ── */}
        <section>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { to: "/opportunities", icon: Trophy, label: "Opportunities", desc: "Browse open partnerships, grants, and business calls.", color: "from-primary/10 to-accent/8" },
              { to: "/jobs", icon: Briefcase, label: "Job Openings", desc: "Permanent and contract roles posted by verified employers.", color: "from-success/10 to-primary/8" },
              { to: "/events", icon: CalendarDays, label: "Events", desc: "Attend Needool clinics, online sessions, and city mixers.", color: "from-accent/10 to-primary/8" },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`group flex flex-col gap-3 rounded-2xl border border-border bg-gradient-to-br ${item.color} p-5 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg`}
              >
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-card shadow-sm text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-base font-bold text-foreground">
                    {item.label}
                    <ArrowRight className="h-4 w-4 opacity-0 -translate-x-1 transition group-hover:opacity-100 group-hover:translate-x-0" />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── CTA Banner ── */}
        <section className="cta-section">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white/90">
              <Sparkles className="h-3 w-3" /> Join Needool today
            </span>
            <h2 className="mx-auto mt-4 max-w-xl text-2xl font-extrabold text-white sm:text-3xl">
              Your skills deserve a global audience.
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/80">
              Create your free profile, post your services, and start connecting with clients near you and around the world.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/signup"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-primary shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                <Sparkles className="h-4 w-4" /> Create free account
              </Link>
              <Link
                to="/search"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/20"
              >
                Browse providers <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
