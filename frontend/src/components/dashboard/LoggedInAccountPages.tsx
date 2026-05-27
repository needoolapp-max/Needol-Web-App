import { Link } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { GlowCard } from "@/components/ui/spotlight-card";
import { useAuth, type User } from "@/context/AuthContext";
import {
  Bell,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Copy,
  HelpCircle,
  MessageSquare,
  ShieldCheck,
  Star,
  TrendingUp,
  User as UserIcon,
  Users,
  Wrench,
} from "lucide-react";

type StatusCard = {
  title: string;
  description: string;
  meta: string;
  status: string;
};

type Stat = {
  label: string;
  value: string;
  detail: string;
};

const profileSkills = ["React", "TypeScript", "Node.js", "UI Design", "Dashboards", "Code Reviews"];

const needRequests: StatusCard[] = [
  {
    title: "React dashboard build",
    description: "Approved public Need Request collecting provider responses.",
    meta: "12 comments",
    status: "Approved",
  },
  {
    title: "Emergency plumber in Lekki",
    description: "Draft request with location, budget, and urgency fields ready.",
    meta: "Due today",
    status: "Pending",
  },
  {
    title: "Brand designer for fintech",
    description: "Closed after enough matched providers responded.",
    meta: "8 responses",
    status: "Closed",
  },
];

const opportunityPosts: StatusCard[] = [
  {
    title: "Creator micro-grant",
    description: "Approved opportunity with eligibility rules and no public comments.",
    meta: "Nigeria",
    status: "Pinned",
  },
  {
    title: "Partnership call",
    description: "Business collaboration opportunity awaiting admin review.",
    meta: "Abuja",
    status: "Pending",
  },
  {
    title: "Design fellowship",
    description: "Saved as a draft until deadline and external link are confirmed.",
    meta: "Draft",
    status: "Private",
  },
];

const jobApplications: StatusCard[] = [
  {
    title: "Frontend Engineer",
    description: "Applied with profile snapshot, CV visibility rules, and custom answers.",
    meta: "Score 86",
    status: "Under review",
  },
  {
    title: "Product Designer",
    description: "Saved opening that matches skills and country filters.",
    meta: "Remote",
    status: "Saved",
  },
  {
    title: "Community Manager",
    description: "Eligibility blocked by nationality rules on the job listing.",
    meta: "Not eligible",
    status: "Blocked",
  },
];

const savedEvents: StatusCard[] = [
  {
    title: "Needool Lagos provider clinic",
    description: "Physical event for profile quality and marketplace safety.",
    meta: "Yaba, Lagos",
    status: "Registered",
  },
  {
    title: "Winning verified hire profiles",
    description: "Online session for active provider accounts.",
    meta: "Online",
    status: "Saved",
  },
  {
    title: "Founder support office hours",
    description: "Admin-posted event with limited seats.",
    meta: "24 seats",
    status: "Open",
  },
];

const reviews: StatusCard[] = [
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
  {
    title: "Moderation protection",
    description: "Low-star reviews can enter admin moderation before publishing.",
    meta: "Policy active",
    status: "Protected",
  },
];

const helpTopics: StatusCard[] = [
  {
    title: "Account states",
    description: "Visitor, inactive, active, and business account capabilities.",
    meta: "3 min read",
    status: "Published",
  },
  {
    title: "Referral rules",
    description: "Typed referral codes win over link attribution during signup.",
    meta: "4 min read",
    status: "Published",
  },
  {
    title: "Posting safety",
    description: "Need Requests, Opportunities, Jobs, and Events approval guidance.",
    meta: "6 min read",
    status: "Published",
  },
];

const businessServices: StatusCard[] = [
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
    description: "Business service bundle with team assignment and lead routing.",
    meta: "Team enabled",
    status: "Draft",
  },
];

const teamMembers: StatusCard[] = [
  {
    title: "Operations desk",
    description: "Receives new inbound leads and contact intents.",
    meta: "3 members",
    status: "Online",
  },
  {
    title: "Field technicians",
    description: "Assigned to in-person repair and service requests.",
    meta: "8 members",
    status: "Available",
  },
  {
    title: "Admin manager",
    description: "Can edit services and close completed Need Requests.",
    meta: "1 owner",
    status: "Active",
  },
];

const businessLeads: StatusCard[] = [
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
    meta: "30 days",
    status: "Open",
  },
];

export function AccountGate({
  children,
  businessOnly = false,
}: {
  children: ReactNode;
  businessOnly?: boolean;
}) {
  const { user } = useAuth();

  if (businessOnly && user?.accountType !== "Business") {
    return (
      <main className="p-6 lg:p-10">
        <EmptyState
          title="Business account required"
          description="This workspace is available to business profiles. Individual accounts keep their own profile, posts, referrals, jobs, events, and reviews."
          icon={<Building2 className="h-5 w-5" />}
          action={
            <Link
              to="/dashboard/profile"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Back to profile
            </Link>
          }
        />
      </main>
    );
  }

  return <>{children}</>;
}

export function ProfilePage() {
  const { user, state } = useAuth();
  return (
    <AccountGate>
      <DashboardPageShell
        icon={<UserIcon />}
        title="Individual Profile"
        description="This is the logged-in individual's profile workspace: identity, public details, skills, CV rules, contact visibility, and activation status."
        stats={[
          { label: "Completeness", value: "92%", detail: "Bio, skills, CV, links" },
          { label: "Profile state", value: state, detail: "Provider account" },
          {
            label: "Referral code",
            value: user?.referralCode ?? "N/A",
            detail: "Shareable signup code",
          },
        ]}
      >
        {state === "inactive" && <InactiveBanner />}
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Panel title="Public profile fields">
            <Field label="Display name" value={user?.name ?? "Guest"} />
            <Field label="Username" value={`@${user?.username ?? "guest"}`} />
            <Field label="Account type" value={user?.accountType ?? "Individual"} />
            <Field label="Location" value="Lagos, Nigeria" />
            <Field label="Hourly range" value="USD 25 - 45" />
            <Field label="Availability" value="Remote, hybrid, short contracts" />
          </Panel>
          <Panel title="Profile controls">
            <StatusList
              items={[
                "CV preview is visible to active members only.",
                "Contact details remain hidden until a viewer is active.",
                "Public links are limited and moderated.",
                "Profile edits are reviewed before going live.",
              ]}
            />
          </Panel>
        </div>
        <Panel title="Skills">
          <div className="flex flex-wrap gap-2">
            {profileSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-foreground"
              >
                {skill}
              </span>
            ))}
          </div>
        </Panel>
      </DashboardPageShell>
    </AccountGate>
  );
}

export function ReferralsPage() {
  const { user } = useAuth();
  return (
    <AccountGate>
      <DashboardPageShell
        icon={<Users />}
        title="Referrals"
        description="Your referral page shows your code, copied invites, successful signups, and notifications when someone joins through you."
        stats={[
          {
            label: "Referral code",
            value: user?.referralCode ?? "N/A",
            detail: "Used during signup",
          },
          {
            label: "Total referrals",
            value: String(user?.referrals.length ?? 0),
            detail: "Confirmed signups",
          },
          { label: "Reward state", value: "Pending", detail: "Rewards unlock at active status" },
        ]}
      >
        {user && <ReferralSummary user={user} />}
      </DashboardPageShell>
    </AccountGate>
  );
}

export function NotificationsPage() {
  const { user } = useAuth();
  return (
    <AccountGate>
      <DashboardPageShell
        icon={<Bell />}
        title="Notifications"
        description="A real logged-in notifications page for referrals, admin approvals, profile activity, account status, and system updates."
        stats={[
          {
            label: "Unread",
            value: String(user?.notifications.length ?? 0),
            detail: "Recent activity",
          },
          { label: "Channels", value: "4", detail: "Referral, account, admin, leads" },
          { label: "Delivery", value: "In-app", detail: "Push and in-app channels" },
        ]}
      >
        <div className="grid gap-3">
          {user?.notifications.length ? (
            user.notifications.map((note, index) => (
              <GlowCard
                key={`${note}-${index}`}
                customSize
                className="flex flex-col rounded-lg p-4"
              >
                <Bell className="mb-3 h-5 w-5 text-primary" />
                <p className="text-sm leading-6 text-foreground">{note}</p>
                <p className="mt-3 text-xs font-semibold text-muted-foreground">
                  Needool system update
                </p>
              </GlowCard>
            ))
          ) : (
            <EmptyState
              title="No notifications yet"
              description="Referral, post approval, and profile lead updates will appear here."
            />
          )}
        </div>
      </DashboardPageShell>
    </AccountGate>
  );
}

export function NeedsPage() {
  return (
    <CardsAccountPage
      icon={<ClipboardList />}
      title="My Need Requests"
      description="Create, review, and manage your logged-in Need Requests."
      stats={[
        { label: "Open", value: "2", detail: "Active or pending" },
        { label: "Comments", value: "12", detail: "Across approved posts" },
        { label: "Closed", value: "1", detail: "Archived request" },
      ]}
      cards={needRequests}
    />
  );
}

export function OpportunitiesPage() {
  return (
    <CardsAccountPage
      icon={<MessageSquare />}
      title="My Opportunities"
      description="Manage opportunities you have submitted, drafted, saved, or published."
      stats={[
        { label: "Published", value: "1", detail: "Visible post" },
        { label: "Pending", value: "1", detail: "Admin review" },
        { label: "Drafts", value: "1", detail: "Private" },
      ]}
      cards={opportunityPosts}
    />
  );
}

export function JobsPage() {
  return (
    <CardsAccountPage
      icon={<Briefcase />}
      title="Job Applications"
      description="Track openings you have saved, applied to, or cannot access because of eligibility rules."
      stats={[
        { label: "Applied", value: "1", detail: "Submitted" },
        { label: "Saved", value: "1", detail: "Ready later" },
        { label: "Blocked", value: "1", detail: "Eligibility" },
      ]}
      cards={jobApplications}
    />
  );
}

export function EventsPage() {
  return (
    <CardsAccountPage
      icon={<Calendar />}
      title="Saved Events"
      description="Browse events connected to your logged-in account: saved, registered, and available sessions."
      stats={[
        { label: "Registered", value: "1", detail: "Confirmed" },
        { label: "Saved", value: "1", detail: "Watchlist" },
        { label: "Open", value: "1", detail: "Seats available" },
      ]}
      cards={savedEvents}
    />
  );
}

export function ReviewsPage() {
  return (
    <CardsAccountPage
      icon={<Star />}
      title="Reviews"
      description="See your received reviews, pending eligibility, and review moderation status."
      stats={[
        { label: "Average", value: "5.0", detail: "Star rating" },
        { label: "Live", value: "1", detail: "Published review" },
        { label: "Pending", value: "1", detail: "Eligibility" },
      ]}
      cards={reviews}
    />
  );
}

export function AccountHelpPage() {
  return (
    <CardsAccountPage
      icon={<HelpCircle />}
      title="Help & Guide"
      description="Help guides for profile rules, posting rules, referrals, account state, and safety."
      stats={[
        { label: "Guides", value: "3", detail: "Published" },
        { label: "Support", value: "In-app", detail: "Help centre" },
        { label: "Policies", value: "Active", detail: "Platform rules" },
      ]}
      cards={helpTopics}
    />
  );
}

export function BusinessProfilePage() {
  const { user } = useAuth();
  return (
    <AccountGate businessOnly>
      <DashboardPageShell
        icon={<Building2 />}
        title="Business Profile"
        description="Business profiles are separate from individuals: legal identity, HQ details, branches, capacity, service limits, and lead routing."
        stats={[
          { label: "Business", value: user?.name ?? "Business", detail: "Organization account" },
          { label: "Service limit", value: "100", detail: "Skills/products/services" },
          { label: "Links", value: "15", detail: "Business link limit" },
        ]}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Organization identity">
            <Field label="Legal name" value={user?.name ?? "FixIt Lagos"} />
            <Field label="Business username" value={`@${user?.username ?? "fixit.lagos"}`} />
            <Field label="Head office" value="Surulere, Lagos" />
            <Field label="Branch mode" value="HQ with branch support" />
          </Panel>
          <Panel title="Business controls">
            <StatusList
              items={[
                "Lead routing is enabled.",
                "Team assignment is available.",
                "Service catalogue is public.",
                "Business analytics are visible.",
              ]}
            />
          </Panel>
        </div>
      </DashboardPageShell>
    </AccountGate>
  );
}

export function BusinessServicesPage() {
  return (
    <CardsBusinessPage
      icon={<Wrench />}
      title="Business Services"
      description="Manage business services, packages, categories, and public offer cards."
      stats={[
        { label: "Listed", value: "2", detail: "Public services" },
        { label: "Draft", value: "1", detail: "Private service" },
        { label: "SLA", value: "4h", detail: "Fastest package" },
      ]}
      cards={businessServices}
    />
  );
}

export function BusinessTeamPage() {
  return (
    <CardsBusinessPage
      icon={<Users />}
      title="Team"
      description="A separate business page for assigning operations, field work, and admin ownership."
      stats={[
        { label: "Members", value: "12", detail: "Across teams" },
        { label: "Online", value: "3", detail: "Ops desk" },
        { label: "Owner", value: "1", detail: "Admin manager" },
      ]}
      cards={teamMembers}
    />
  );
}

export function BusinessLeadsPage() {
  return (
    <CardsBusinessPage
      icon={<MessageSquare />}
      title="Leads"
      description="Business-only contact reveals, outbound clicks, hire intent events, and follow-up states."
      stats={[
        { label: "New", value: "1", detail: "Needs action" },
        { label: "Warm", value: "1", detail: "Hire intent" },
        { label: "Open", value: "1", detail: "Notify request" },
      ]}
      cards={businessLeads}
    />
  );
}

export function BusinessAnalyticsPage() {
  return (
    <AccountGate businessOnly>
      <DashboardPageShell
        icon={<TrendingUp />}
        title="Business Analytics"
        description="Business metrics for profile visibility, lead conversion, referrals, services, and demand signals."
        stats={[
          { label: "Views", value: "1,284", detail: "Last 30 days" },
          { label: "Conversion", value: "22%", detail: "Contact reveals" },
          { label: "Growth", value: "+18%", detail: "Profile views" },
        ]}
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            ["Top service", "AC Service", "436 searches"],
            ["Best source", "Search results", "58% of leads"],
            ["Referral signups", "3", "From FIXIT-LAGOS"],
          ].map(([label, value, detail]) => (
            <Panel key={label} title={label}>
              <div className="text-3xl font-extrabold text-foreground">{value}</div>
              <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
            </Panel>
          ))}
        </div>
      </DashboardPageShell>
    </AccountGate>
  );
}

function CardsAccountPage({
  icon,
  title,
  description,
  stats,
  cards,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  stats: Stat[];
  cards: StatusCard[];
}) {
  return (
    <AccountGate>
      <DashboardPageShell icon={icon} title={title} description={description} stats={stats}>
        <CardGrid cards={cards} />
      </DashboardPageShell>
    </AccountGate>
  );
}

function CardsBusinessPage({
  icon,
  title,
  description,
  stats,
  cards,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  stats: Stat[];
  cards: StatusCard[];
}) {
  return (
    <AccountGate businessOnly>
      <DashboardPageShell icon={icon} title={title} description={description} stats={stats}>
        <CardGrid cards={cards} />
      </DashboardPageShell>
    </AccountGate>
  );
}

function DashboardPageShell({
  icon,
  title,
  description,
  stats,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  stats: Stat[];
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-10">
      <section className="mb-6 rounded-2xl border border-border bg-card p-6">
        <div className="inline-flex rounded-xl bg-primary/15 p-2 text-primary [&_svg]:h-5 [&_svg]:w-5">
          {icon}
        </div>
        <h1 className="mt-4 text-2xl font-extrabold text-foreground sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
      </section>
      <div className="mb-6 grid gap-3 md:grid-cols-3">
        {stats.map((stat) => (
          <GlowCard key={stat.label} customSize className="flex flex-col rounded-lg p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-2 text-2xl font-extrabold capitalize text-foreground">{stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.detail}</p>
          </GlowCard>
        ))}
      </div>
      <div className="space-y-4">{children}</div>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <strong className="text-right text-sm text-foreground">{value}</strong>
    </div>
  );
}

function StatusList({ items }: { items: string[] }) {
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <div
          key={item}
          className="flex gap-3 rounded-xl bg-secondary p-3 text-sm text-muted-foreground"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function ReferralSummary({ user }: { user: User }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Panel title="Your referral code">
        <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary p-3">
          <strong className="text-lg text-foreground">{user.referralCode}</strong>
          <button
            onClick={() => navigator.clipboard?.writeText(user.referralCode)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
          >
            <Copy className="h-3.5 w-3.5" /> Copy
          </button>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Share this code. New signups can enter it and appear in your referral list.
        </p>
      </Panel>
      <Panel title="Referral activity">
        <div className="grid gap-2">
          {user.referrals.length ? (
            user.referrals.map((referral) => (
              <div
                key={referral.userId}
                className="flex items-center justify-between rounded-xl bg-secondary p-3 text-sm"
              >
                <div>
                  <div className="font-semibold text-foreground">{referral.name}</div>
                  <div className="text-xs text-muted-foreground">@{referral.username}</div>
                </div>
                <span className="rounded-lg bg-success/15 px-2 py-1 text-xs font-bold text-success">
                  {referral.status}
                </span>
              </div>
            ))
          ) : (
            <p className="rounded-xl bg-secondary p-3 text-sm text-muted-foreground">
              No referrals yet.
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}

function InactiveBanner() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-accent/40 bg-accent/10 p-4">
      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
      <div className="flex-1 text-sm">
        <p className="font-semibold text-foreground">Your account is inactive</p>
        <p className="text-muted-foreground">
          Activate your account to reveal contact info, links, CVs, posting, applications, and
          business leads.
        </p>
      </div>
      <button className="shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
        Activate
      </button>
    </div>
  );
}

function CardGrid({ cards }: { cards: StatusCard[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <GlowCard key={card.title} customSize className="flex flex-col rounded-lg p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-bold text-foreground">{card.title}</h2>
            <span className="shrink-0 rounded-lg bg-primary/15 px-2 py-1 text-xs font-bold text-primary">
              {card.status}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{card.description}</p>
          <p className="mt-4 border-t border-border pt-3 text-xs font-semibold text-muted-foreground">
            {card.meta}
          </p>
        </GlowCard>
      ))}
    </div>
  );
}
