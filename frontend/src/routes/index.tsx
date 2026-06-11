import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, lazy, Suspense, type ComponentType } from "react";
import { TopNav } from "@/components/nav/TopNav";
import { Footer } from "@/components/nav/Footer";
import { FreelancerProfileCard } from "@/components/ui/freelancer-profile-card";
import { providers, needs, type Provider } from "@/lib/mockData";
import {
  ArrowUpRight,
  BookOpen,
  Briefcase,
  Calendar,
  Camera,
  Code2,
  Film,
  HeartPulse,
  Megaphone,
  MoveRight,
  Palette,
  Scale,
  Sparkles,
  Truck,
  Wallet,
  Wrench,
} from "lucide-react";

// Banner pool for FreelancerProfileCard. Three known-existing Unsplash IDs
// rotated deterministically by provider position. All three are tasteful
// abstract / workspace shots that read well at 900x300.
const FEATURED_BANNERS = [
  "https://images.unsplash.com/photo-1750682053165-ed96153fb0b2?ixlib=rb-4.1.0&auto=format&fit=crop&q=60&w=900",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=60&w=900",
  "https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?auto=format&fit=crop&q=60&w=900",
];

// Derive a single "tool" Lucide icon from a skill keyword. Falls back to a
// neutral Wrench so every card always renders 1–2 icons.
function toolIconFor(skill: string): ComponentType<{ className?: string }> {
  const s = skill.toLowerCase();
  if (s.includes("design") || s.includes("ui") || s.includes("brand") || s.includes("figma") || s.includes("illustration")) return Palette;
  if (s.includes("react") || s.includes("typescript") || s.includes("node") || s.includes("frontend") || s.includes("engineering") || s.includes("code")) return Code2;
  if (s.includes("photo")) return Camera;
  if (s.includes("market") || s.includes("growth")) return Megaphone;
  if (s.includes("data") || s.includes("python") || s.includes("ml") || s.includes("science")) return BookOpen;
  if (s.includes("video") || s.includes("motion") || s.includes("editing") || s.includes("media")) return Film;
  return Wrench;
}

// Build the 2-icon "Tools" cluster the card expects. We pick distinct icons
// from the provider's skill list and never show duplicates.
function ToolsCluster({ skills }: { skills: string[] }) {
  const seen = new Set<ComponentType<{ className?: string }>>();
  for (const s of skills) {
    seen.add(toolIconFor(s));
    if (seen.size >= 2) break;
  }
  if (seen.size === 0) seen.add(Wrench);
  return (
    <>
      {Array.from(seen).map((Icon, i) => (
        <span
          key={i}
          className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground"
        >
          <Icon className="h-4 w-4" />
        </span>
      ))}
    </>
  );
}

// Deterministic 4.6–5.0 rating from a string id so each card stays stable
// across re-renders without altering the underlying provider type.
function ratingFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return 4.6 + ((hash % 5) / 10); // 4.6, 4.7, 4.8, 4.9, 5.0
}

// Short typical-engagement label per card.
const DURATIONS = ["5 Days", "8 Days", "2 Weeks", "1 Month", "Ongoing"];
function durationFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return DURATIONS[hash % DURATIONS.length];
}

// Two top skills joined into the "title" line under the name.
function titleFor(p: Provider) {
  return p.skills.slice(0, 2).join(" / ") || p.accountType;
}

// Lazy-loaded so framer-motion (only used by the hero) stays out of the
// homepage's initial bundle. The fallback reserves the hero's height to avoid
// layout shift while the chunk loads.
const NeedoolHero = lazy(() =>
  import("@/components/ui/background-paths").then((m) => ({ default: m.NeedoolHero })),
);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Needool - Find trusted skills, near you or worldwide" },
      {
        name: "description",
        content:
          "Discover and hire verified providers across skills, services, and products. Local search with worldwide reach.",
      },
      { property: "og:title", content: "Needool - Global skills directory" },
      { property: "og:description", content: "Discover and hire verified providers worldwide." },
    ],
  }),
  component: Home,
});

type Category = { label: string; icon: ComponentType<{ className?: string }> };

const categories: Category[] = [
  { label: "Technology", icon: Code2 },
  { label: "Design", icon: Palette },
  { label: "Marketing", icon: Megaphone },
  { label: "Finance", icon: Wallet },
  { label: "Legal", icon: Scale },
  { label: "Health", icon: HeartPulse },
  { label: "Education", icon: BookOpen },
  { label: "Engineering", icon: Wrench },
  { label: "Media", icon: Film },
  { label: "Logistics", icon: Truck },
];

const steps = [
  {
    title: "Search what you need.",
    desc: "Type a skill, service, or category. Filter by city, country, or worldwide — results rank active providers first.",
  },
  {
    title: "Review and connect.",
    desc: "Browse verified profiles, ratings, and portfolios. Post a Need Request and let providers come to you.",
  },
  {
    title: "Hire with confidence.",
    desc: "Every hire is tracked, reviewed, and protected by Needool's trust layer — from quote to completion.",
  },
];

type PillarItem = {
  to: string;
  label: string;
  desc: string;
  icon: ComponentType<{ className?: string }>;
};

const pillars: PillarItem[] = [
  {
    to: "/opportunities",
    label: "Opportunities",
    desc: "Open partnerships, grants, and business calls.",
    icon: Sparkles,
  },
  {
    to: "/jobs",
    label: "Job Openings",
    desc: "Permanent and contract roles from verified employers.",
    icon: Briefcase,
  },
  {
    to: "/events",
    label: "Events",
    desc: "Needool clinics, online sessions, and city mixers.",
    icon: Calendar,
  },
];

function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);
  const topProviders = providers.filter((p) => p.status === "active").slice(0, 6);
  const recentNeeds = needs.slice(0, 6);

  return (
    <div className="needool-shell min-h-screen bg-background">
      <TopNav />

      {/* ── Animated hero (kept untouched) ── */}
      <Suspense fallback={<div className="min-h-[580px] border-b border-border bg-sidebar/90" />}>
        <NeedoolHero />
      </Suspense>

      {/* ── Live signal strip ── */}
      <section
        aria-label="Live network signal"
        className="border-y border-border bg-card"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-4 py-3 text-xs font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-2 whitespace-nowrap font-bold uppercase tracking-[0.18em] text-foreground">
            <span aria-hidden className="relative inline-flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            Live
          </span>
          <span className="whitespace-nowrap">
            <span className="font-semibold text-foreground">1,247</span> active providers
          </span>
          <span aria-hidden className="h-3 w-px shrink-0 bg-border" />
          <span className="whitespace-nowrap">
            <span className="font-semibold text-foreground">89</span> joined this week
          </span>
          <span aria-hidden className="h-3 w-px shrink-0 bg-border" />
          <span className="whitespace-nowrap">
            <span className="font-semibold text-foreground">12</span> countries
          </span>
          <Link
            to="/search"
            className="ml-auto hidden shrink-0 items-center gap-1 whitespace-nowrap text-xs font-semibold text-primary hover:underline sm:inline-flex"
          >
            Explore the network
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* ── Category rail (Lucide icons; no emoji) ── */}
      <section
        aria-label="Browse by category"
        className="border-b border-border bg-background"
      >
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="mb-3 flex items-baseline justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Browse by category
            </p>
            <Link
              to="/search"
              className="text-xs font-semibold text-foreground/70 underline-offset-4 hover:text-primary hover:underline"
            >
              See all
            </Link>
          </div>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {categories.map((cat) => (
              <Link
                key={cat.label}
                to="/search"
                className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:bg-secondary"
              >
                <cat.icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
        {/* ── 01 — Featured providers ── */}
        <section className="mb-20">
          <EditorialHeader
            number="01"
            kicker="Featured"
            title="Top providers, ranked by activity."
            sub="Verified, recently active, and open to work right now."
            cta={{ to: "/search", label: "View all providers" }}
          />
          <div className="mt-8 grid place-items-center gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    aria-hidden
                    className="h-[460px] w-full max-w-sm animate-pulse rounded-2xl border border-border bg-card"
                  />
                ))
              : topProviders.map((p, i) => (
                  <FreelancerProfileCard
                    key={p.id}
                    name={p.name}
                    title={titleFor(p)}
                    avatarSrc={p.avatar}
                    bannerSrc={FEATURED_BANNERS[i % FEATURED_BANNERS.length]}
                    rating={ratingFor(p.id)}
                    duration={durationFor(p.id)}
                    rate={`$${p.hourlyRate}/hr`}
                    tools={<ToolsCluster skills={p.skills} />}
                    onGetInTouch={() => void navigate({ to: `/p/${p.username}` })}
                  />
                ))}
          </div>
          <Link
            to="/search"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border py-3 text-sm font-semibold text-primary hover:bg-secondary sm:hidden"
          >
            View all providers
            <MoveRight className="h-4 w-4" />
          </Link>
        </section>

        {/* ── 02 — How it works ── */}
        <section className="mb-20">
          <EditorialHeader
            number="02"
            kicker="How it works"
            title="Three steps from need to verified hire."
            sub="No middlemen, no surprises. The same flow scales from a quick fix to a long-term contract."
          />
          <ol className="mt-8 divide-y divide-border border-y border-border">
            {steps.map((step, i) => (
              <li
                key={step.title}
                className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 py-7 sm:grid-cols-[5rem_1fr_auto] sm:gap-x-10 sm:py-9"
              >
                <span
                  aria-hidden
                  className="font-heading text-3xl font-extralight leading-none text-muted-foreground sm:text-4xl"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="col-start-2 max-w-2xl">
                  <h3 className="font-heading text-lg font-bold text-foreground sm:text-xl">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── 03 — Live demand (newsfeed) ── */}
        <section className="mb-20">
          <EditorialHeader
            number="03"
            kicker="Live demand"
            title="Recent Need Requests."
            sub="Open jobs posted by people and businesses across the network."
            cta={{ to: "/needs", label: "See all needs" }}
          />
          <ul className="mt-8 divide-y divide-border border-y border-border">
            {recentNeeds.map((n) => (
              <li key={n.id}>
                <Link
                  to="/needs"
                  className="group flex flex-col gap-2 px-1 py-5 transition-colors hover:bg-secondary/40 sm:flex-row sm:items-center sm:gap-6"
                >
                  <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground sm:w-44 sm:shrink-0">
                    <span>{n.postedAgo}</span>
                    <span aria-hidden className="hidden h-3 w-px bg-border sm:inline-block" />
                    <span className="truncate normal-case tracking-normal text-foreground/80">
                      {n.location}
                    </span>
                  </div>
                  <h3 className="font-heading text-base font-semibold text-foreground transition-colors group-hover:text-primary sm:flex-1 sm:text-lg">
                    {n.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    {n.tags.slice(0, 2).map((t) => (
                      <span
                        key={t}
                        className="rounded border border-border bg-background px-2 py-0.5 text-[11px] font-semibold text-foreground/80"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="font-heading text-sm font-bold text-foreground sm:w-36 sm:shrink-0 sm:text-right">
                    {n.budget}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ── 04 — Explore pillars ── */}
        <section className="mb-20">
          <EditorialHeader
            number="04"
            kicker="Explore"
            title="Beyond providers."
            sub="Opportunities, openings, and events from the same trusted network."
          />
          <div className="mt-8 grid divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {pillars.map((p) => (
              <Link
                key={p.to}
                to={p.to}
                className="group flex items-start gap-4 px-1 py-6 transition-colors hover:bg-secondary/40 sm:px-6"
              >
                <p.icon className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-heading text-base font-bold text-foreground">
                    {p.label}
                    <ArrowUpRight className="h-4 w-4 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
                  </div>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{p.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── 05 — Closing (asymmetric, no gradient) ── */}
        <section
          aria-label="Join Needool"
          className="grid gap-10 border-t-2 border-foreground pt-12 sm:grid-cols-[1.5fr_1fr] sm:gap-16 sm:pt-16"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Join the network
            </p>
            <h2 className="mt-3 font-heading text-3xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
              Your skills deserve a global audience.
            </h2>
          </div>
          <div className="flex flex-col gap-5 sm:items-end sm:text-right">
            <p className="max-w-sm text-sm leading-7 text-muted-foreground">
              Create your free profile, post your services, and start connecting with clients near
              you and around the world. No upfront fees, no platform commission on hires.
            </p>
            <div className="flex flex-wrap gap-3 sm:justify-end">
              <Link
                to="/signup"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-foreground px-5 py-3 text-sm font-bold text-background transition-opacity hover:opacity-90"
              >
                Create free account
                <MoveRight className="h-4 w-4" />
              </Link>
              <Link
                to="/search"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-5 py-3 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
              >
                Browse providers
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function EditorialHeader({
  number,
  kicker,
  title,
  sub,
  cta,
}: {
  number: string;
  kicker: string;
  title: string;
  sub?: string;
  cta?: { to: string; label: string };
}) {
  return (
    <header className="border-t-2 border-foreground pt-6">
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-4">
          <span
            aria-hidden
            className="font-heading text-sm font-extrabold tracking-wider text-foreground"
          >
            {number}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            {kicker}
          </span>
        </div>
        {cta && (
          <Link
            to={cta.to}
            className="hidden items-center gap-1 text-xs font-semibold text-foreground/70 underline-offset-4 hover:text-primary hover:underline sm:inline-flex"
          >
            {cta.label}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <h2 className="mt-4 max-w-3xl font-heading text-2xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      {sub && <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{sub}</p>}
    </header>
  );
}
