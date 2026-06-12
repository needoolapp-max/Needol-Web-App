import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { SearchBar } from "@/components/search/SearchBar";
import { ProviderCard } from "@/components/cards/ProviderCard";
import { ProviderCardSkeleton } from "@/components/common/ProviderCardSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { DashboardPageHeader } from "@/components/common/DashboardPageHeader";
import { providers, needs } from "@/lib/mockData";
import { useAuth, type User } from "@/context/AuthContext";
import {
  Bell,
  Briefcase,
  Building2,
  Calendar,
  ClipboardList,
  Copy,
  HelpCircle,
  Lock,
  MessageSquare,
  Star,
  Users,
} from "lucide-react";
import { GlowCard } from "@/components/ui/spotlight-card";

type PageCard = {
  title: string;
  description: string;
  meta: string;
  status: string;
};

const individualPages: Record<string, { title: string; description: string; cards: PageCard[] }> = {
  profile: {
    title: "Individual profile",
    description:
      "Manage your personal provider profile, skills, CV preview, rates, and public availability.",
    cards: [
      {
        title: "Profile completeness",
        description:
          "Bio, skills, location, CV, links, hourly rate, and remote toggle are ready for review.",
        meta: "92% complete",
        status: "Active",
      },
      {
        title: "Skill stack",
        description: "React, TypeScript, Node.js, UI Design, Code Reviews, Dashboard Builds.",
        meta: "6 skills",
        status: "Visible",
      },
      {
        title: "CV preview",
        description: "View-only CV area is present. Download remains disabled by policy.",
        meta: "5 MB max",
        status: "Locked for inactive viewers",
      },
    ],
  },
  referrals: {
    title: "Referrals",
    description: "Track signups that used your referral code and view real-time referral activity.",
    cards: [],
  },
  notifications: {
    title: "Notifications",
    description: "Your feed for account events, referrals, profile leads, and approval updates.",
    cards: [],
  },
  needs: {
    title: "My Need Requests",
    description: "Manage your user-posted Need Requests and their approval/closed states.",
    cards: [
      {
        title: "React dashboard build",
        description: "Approved, visible worldwide, and receiving comments.",
        meta: "12 comments",
        status: "Approved",
      },
      {
        title: "Emergency plumber in Lekki",
        description: "Waiting for admin moderation before going live.",
        meta: "Submitted today",
        status: "Pending",
      },
      {
        title: "Brand designer for fintech",
        description: "Closed after receiving enough provider responses.",
        meta: "Closed",
        status: "Archived",
      },
    ],
  },
  opportunities: {
    title: "My Opportunities",
    description: "Manage grants, contests, partnerships, and fellowships you have shared.",
    cards: [
      {
        title: "Creator micro-grant",
        description: "Approved opportunity open to eligible creators and makers.",
        meta: "Nigeria",
        status: "Pinned",
      },
      {
        title: "Partnership call",
        description: "Business collaboration opportunity awaiting admin review.",
        meta: "Abuja",
        status: "Pending",
      },
    ],
  },
  jobs: {
    title: "Job applications",
    description:
      "Track openings you are eligible for and applications submitted from your profile snapshot.",
    cards: [
      {
        title: "Frontend Engineer",
        description: "Profile snapshot, CV, and custom answers submitted.",
        meta: "Score 86",
        status: "Under review",
      },
      {
        title: "Community Manager",
        description: "Application does not match your current nationality filter.",
        meta: "Not eligible",
        status: "Blocked",
      },
    ],
  },
  events: {
    title: "Saved Events",
    description: "Admin-posted events you have saved or registered interest in.",
    cards: [
      {
        title: "Needool Lagos provider clinic",
        description: "Physical event for profile quality and marketplace safety.",
        meta: "Yaba, Lagos",
        status: "Registered",
      },
      {
        title: "Winning verified hire profiles",
        description: "Online session for active provider profiles.",
        meta: "Online",
        status: "Saved",
      },
    ],
  },
  reviews: {
    title: "Reviews",
    description:
      "Reviews received, reviews you can leave, and moderation state for low-star reviews.",
    cards: [
      {
        title: "Verified Hire review",
        description: "Employer review from a completed verified hire.",
        meta: "5 stars",
        status: "Live",
      },
      {
        title: "Member review eligibility",
        description: "Unlocks after 30 continuous active days with an active account.",
        meta: "23 days left",
        status: "Pending",
      },
    ],
  },
  help: {
    title: "Help & Guide",
    description: "Account help, billing rules, referrals, reviews, safety, and posting limits.",
    cards: [
      {
        title: "How account states work",
        description: "Visitor, inactive, and active account capabilities.",
        meta: "3 min read",
        status: "Published",
      },
      {
        title: "Referral code rules",
        description: "Typed referral code wins over link attribution at signup.",
        meta: "4 min read",
        status: "Published",
      },
    ],
  },
};

const businessPages: Record<string, { title: string; description: string; cards: PageCard[] }> = {
  "business-profile": {
    title: "Business profile",
    description:
      "Business profiles emphasize legal name, service capacity, branch/HQ details, team services, and higher limits.",
    cards: [
      {
        title: "Organization identity",
        description:
          "Legal organization name, business address, HQ/branch status, phone, and WhatsApp.",
        meta: "Immutable legal name",
        status: "Active",
      },
      {
        title: "Service catalogue",
        description: "Business accounts can list up to 100 skills/products/services and 15 links.",
        meta: "100 item limit",
        status: "Visible",
      },
      {
        title: "Lead routing",
        description:
          "Contact intent can route to business inboxes, branches, or assigned team members.",
        meta: "Automated",
        status: "Ready",
      },
    ],
  },
  services: {
    title: "Business services",
    description:
      "Manage business service packages, product/service categories, and public offer cards.",
    cards: [
      {
        title: "AC maintenance contract",
        description: "Recurring service package for apartments and office buildings.",
        meta: "USD 180/mo",
        status: "Listed",
      },
      {
        title: "Emergency callout",
        description: "Same-day provider dispatch for Lagos customers.",
        meta: "4 hour SLA",
        status: "Listed",
      },
      {
        title: "Installations",
        description: "Business service bundle with team assignment.",
        meta: "Team enabled",
        status: "Draft",
      },
    ],
  },
  team: {
    title: "Team",
    description:
      "Team workspace for business accounts to assign leads, jobs, and service requests.",
    cards: [
      {
        title: "Operations desk",
        description: "Receives new inbound leads and contact intents.",
        meta: "3 members",
        status: "Online",
      },
      {
        title: "Field technicians",
        description: "Assigned to in-person repair/service requests.",
        meta: "8 members",
        status: "Available",
      },
      {
        title: "Admin manager",
        description: "Can edit services and close completed Need Requests.",
        meta: "1 owner",
        status: "Active",
      },
    ],
  },
  leads: {
    title: "Leads",
    description:
      "Business-only view for contact reveals, outbound link clicks, and hire intent events.",
    cards: [
      {
        title: "Contact reveal",
        description: "A Lagos visitor revealed WhatsApp contact information.",
        meta: "2h ago",
        status: "New",
      },
      {
        title: "Hire intent",
        description: "A signed-in buyer clicked Contact / Hire from your profile.",
        meta: "Today",
        status: "Warm",
      },
      {
        title: "Notify when active",
        description: "A viewer requested activation notification for a branch profile.",
        meta: "Expires in 30 days",
        status: "Open",
      },
    ],
  },
  analytics: {
    title: "Business analytics",
    description:
      "Business metrics for profile views, lead conversion, referrals, and service demand.",
    cards: [
      {
        title: "Profile views",
        description: "Public business profile impressions in the last 30 days.",
        meta: "1,284",
        status: "+18%",
      },
      {
        title: "Lead conversion",
        description: "Contact reveals that became active conversations.",
        meta: "22%",
        status: "+4%",
      },
      {
        title: "Top service",
        description: "AC Service is the most discovered service this month.",
        meta: "436 searches",
        status: "Trending",
      },
    ],
  },
};

const pageIcons: Record<string, ComponentType<{ className?: string }>> = {
  profile: Users,
  referrals: Users,
  notifications: Bell,
  needs: ClipboardList,
  opportunities: MessageSquare,
  jobs: Briefcase,
  events: Calendar,
  reviews: Star,
  help: HelpCircle,
  "business-profile": Building2,
  services: ClipboardList,
  team: Users,
  leads: MessageSquare,
  analytics: Star,
};

export function DashboardHome() {
  const { state, user } = useAuth();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const list = useMemo(() => providers.filter((p) => p.status === "active").slice(0, 9), []);

  const isBusiness = user?.accountType === "Business";

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-10">
      <DashboardPageHeader
        title={`Welcome back, ${user?.name.split(" ")[0] ?? "there"}.`}
        sub={
          isBusiness
            ? "Run your business profile, services, team, leads, and marketplace visibility."
            : "Manage your profile, referrals, needs, applications, events, and reviews."
        }
        breadcrumbs={[{ label: "Dashboard" }]}
        action={
          <Link
            to={isBusiness ? "/dashboard/business-profile" : "/dashboard/profile"}
            className="inline-flex items-center rounded-lg bg-foreground px-4 py-2 text-sm font-bold text-background transition-opacity hover:opacity-90"
          >
            Edit profile
          </Link>
        }
      />

      {state === "inactive" && (
        <div className="mt-6">
          <InactiveBanner />
        </div>
      )}

      <dl className="mt-8 grid divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          {
            label: isBusiness ? "Open leads" : "Open needs",
            value: isBusiness ? 12 : needs.length,
            icon: ClipboardList,
          },
          { label: "Referrals", value: user?.referrals.length ?? 0, icon: Users },
          { label: "Notifications", value: user?.notifications.length ?? 0, icon: Bell },
        ].map((s) => (
          <StatCell key={s.label} label={s.label} value={s.value} icon={s.icon} />
        ))}
      </dl>

      <div className="mb-6">
        <SearchBar variant="skills" />
      </div>

      {user && <ReferralSummary user={user} />}

      {isBusiness ? <BusinessOverview /> : <IndividualOverview />}

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-lg font-bold text-foreground">Suggested providers</h2>
          <Link to="/search" className="text-sm font-semibold text-primary">
            Browse all
          </Link>
        </div>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProviderCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((p) => (
              <ProviderCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export function DashboardSection({ section }: { section: string }) {
  const { user } = useAuth();

  const isBusiness = user?.accountType === "Business";
  const config = individualPages[section] ?? businessPages[section] ?? individualPages.profile;
  const Icon = pageIcons[section] ?? Users;

  // Phase 10-2 — Icon is now a meaning hint shown inline beside the mono
  // kicker, not a primary/15-tinted icon well. Avoid an unused-import
  // warning by referencing it explicitly in the JSX below.
  const breadcrumbLabel = config.title;

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-10">
      <DashboardPageHeader
        title={config.title}
        sub={config.description}
        breadcrumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: breadcrumbLabel },
        ]}
        action={
          <span className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/80">
            <Icon className="h-3.5 w-3.5" />
            {section}
          </span>
        }
      />

      {isBusiness && section.startsWith("business") && (
        <p className="mt-6 border-t border-border pt-5 text-sm leading-7 text-muted-foreground">
          Business accounts show organization-level fields, service limits, team operations, and
          lead-routing surfaces.
        </p>
      )}

      <div className="mt-8">
        {section === "referrals" && user ? <ReferralSummary user={user} /> : null}
        {section === "notifications" && user ? <Notifications user={user} /> : null}
        {section !== "referrals" && section !== "notifications" ? (
          <CardGrid cards={config.cards} />
        ) : null}
      </div>
    </main>
  );
}

function InactiveBanner() {
  return (
    <div className="flex flex-col gap-3 border-y border-foreground py-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex items-center gap-3">
        <Lock className="h-4 w-4 shrink-0 text-foreground" />
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground">
          Inactive account
        </span>
      </div>
      <p className="flex-1 text-sm leading-6 text-muted-foreground">
        Activate to reveal contact info, links, CVs, posting, applications, and business leads.
      </p>
      <button className="inline-flex shrink-0 items-center justify-center rounded-lg bg-foreground px-4 py-2 text-sm font-bold text-background transition-opacity hover:opacity-90">
        Activate
      </button>
    </div>
  );
}

function StatCell({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col gap-1 px-1 py-4 sm:px-5 sm:py-5">
      <div className="flex items-center gap-2">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/80">
          {label}
        </dt>
      </div>
      <dd className="font-heading text-3xl font-extrabold leading-none tracking-tight text-foreground sm:text-4xl">
        {value}
      </dd>
    </div>
  );
}

function ReferralSummary({ user }: { user: User }) {
  return (
    <section className="grid gap-10 lg:grid-cols-[320px_1fr]">
      {/* Referral code */}
      <div>
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/80">
          Referral code
        </p>
        <div className="mt-3 flex items-center justify-between gap-3 border-y border-foreground py-3">
          <strong className="font-mono text-lg tracking-[0.06em] text-foreground">
            {user.referralCode}
          </strong>
          <button
            onClick={() => navigator.clipboard?.writeText(user.referralCode)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-background transition-opacity hover:opacity-90"
          >
            <Copy className="h-3 w-3" /> Copy
          </button>
        </div>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Share this code. New signups can enter it and appear in your referral list.
        </p>
      </div>

      {/* Referral activity ledger */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/80">
            Referral activity
          </h2>
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">
            {user.referrals.length} Total
          </span>
        </div>
        <ul className="mt-4 divide-y divide-border border-y border-border">
          {user.referrals.length ? (
            user.referrals.map((referral) => (
              <li
                key={referral.userId}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold text-foreground">{referral.name}</div>
                  <div className="truncate font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    @{referral.username}
                  </div>
                </div>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-success">
                  {referral.status}
                </span>
              </li>
            ))
          ) : (
            <li className="py-4 text-sm text-muted-foreground">No referrals yet.</li>
          )}
        </ul>
      </div>
    </section>
  );
}

function Notifications({ user }: { user: User }) {
  return (
    <div className="grid gap-3">
      {user.notifications.length ? (
        user.notifications.map((note, index) => (
          <GlowCard
            key={`${note}-${index}`}
            customSize
            className="flex flex-col rounded-lg p-4 text-sm text-foreground"
          >
            <Bell className="mb-2 h-4 w-4 text-primary" />
            {note}
          </GlowCard>
        ))
      ) : (
        <EmptyState
          title="No notifications yet"
          description="Referral, post approval, and profile lead updates will appear here."
        />
      )}
    </div>
  );
}

function DashboardCard({ card }: { card: PageCard }) {
  return (
    <article className="flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-heading text-base font-bold text-foreground">{card.title}</h3>
        <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          {card.status}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{card.description}</p>
      <p className="mt-4 border-t border-border pt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-foreground/70">
        {card.meta}
      </p>
    </article>
  );
}

function CardGrid({ cards }: { cards: PageCard[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <DashboardCard key={card.title} card={card} />
      ))}
    </div>
  );
}

function IndividualOverview() {
  return <CardGrid cards={individualPages.profile.cards.slice(0, 3)} />;
}

function BusinessOverview() {
  return <CardGrid cards={businessPages["business-profile"].cards.slice(0, 3)} />;
}
