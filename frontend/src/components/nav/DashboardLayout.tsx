import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  User,
  Users,
  Bell,
  Bookmark,
  ClipboardList,
  Briefcase,
  Calendar,
  Star,
  HelpCircle,
  Menu,
  X,
  LogOut,
  Sparkles,
  Building2,
  Wrench,
  MessageSquare,
  ChartNoAxesCombined,
  Lock,
} from "lucide-react";
import { memo, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { ThemeToggle } from "@/components/nav/ThemeToggle";

type DashboardItem = {
  label: string;
  icon: typeof LayoutDashboard;
  to: string;
};

// Phase 10-2 — section grouping for the editorial ruled sidebar. The single
// flat list felt admin-y; grouping reads like a table of contents and lets
// active state work as a clean left-rule rather than a filled pill.
const workspaceItems: DashboardItem[] = [
  { label: "Main", to: "/dashboard", icon: LayoutDashboard },
  { label: "Profile", to: "/dashboard/profile", icon: User },
  { label: "Notifications", to: "/dashboard/notifications", icon: Bell },
  { label: "Saved", to: "/dashboard/saves", icon: Bookmark },
  { label: "Referrals", to: "/dashboard/referrals", icon: Users },
];

const activityItems: DashboardItem[] = [
  { label: "Needs", to: "/dashboard/needs", icon: ClipboardList },
  { label: "Opportunities", to: "/dashboard/opportunities", icon: Sparkles },
  { label: "Job Openings", to: "/dashboard/jobs", icon: Briefcase },
  { label: "Events", to: "/dashboard/events", icon: Calendar },
  { label: "Reviews", to: "/dashboard/reviews", icon: Star },
];

const supportItems: DashboardItem[] = [
  { label: "Help & Guide", to: "/dashboard/help", icon: HelpCircle },
];

const businessItems: DashboardItem[] = [
  { label: "Business Profile", to: "/dashboard/business-profile", icon: Building2 },
  { label: "Services", to: "/dashboard/services", icon: Wrench },
  { label: "Team", to: "/dashboard/team", icon: Users },
  { label: "Leads", to: "/dashboard/leads", icon: MessageSquare },
  { label: "Analytics", to: "/dashboard/analytics", icon: ChartNoAxesCombined },
];

function useUnreadCount(getToken: () => Promise<string | null>, isSignedIn: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    let timer: number | null = null;
    async function tick() {
      try {
        const r = await apiFetch<{ data: { count: number } }>(
          "/api/notifications/unread-count",
          { getToken },
        );
        if (!cancelled) setCount(r.data.count || 0);
      } catch {
        /* leave count as-is */
      }
      timer = window.setTimeout(tick, 30_000);
    }
    void tick();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [getToken, isSignedIn]);
  return count;
}

export const DashboardLayout = memo(function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const { user, state, logout, loading, getToken } = useAuth();
  const unread = useUnreadCount(getToken, Boolean(user));

  // Phase 9-4 — hard gate. If the user signed in but hasn't completed the
  // PRD §2.3 / §2.4 demographic capture, bounce them to /onboarding before
  // they can reach any dashboard surface. Visitor state still renders the
  // existing sign-in CTA below.
  useEffect(() => {
    if (loading) return;
    if (user && !user.onboardingComplete) {
      void navigate({ to: "/onboarding" });
    }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // While the redirect-to-onboarding effect navigates, render the spinner
  // so we don't briefly flash the dashboard shell to a not-yet-onboarded
  // user.
  if (user && !user.onboardingComplete) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (state === "visitor") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <div className="inline-flex rounded-2xl bg-primary/10 p-4 text-primary">
          <Lock className="h-7 w-7" />
        </div>
        <p className="text-base font-semibold text-foreground">Sign in to view your dashboard</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Create a free account or log in to access your provider feed, needs, referrals, and
          notifications.
        </p>
        <div className="flex gap-3">
          <Link
            to="/login"
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Sign up
          </Link>
        </div>
      </div>
    );
  }

  const SidebarBody = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <Link
        to="/"
        className="flex items-center gap-2 border-b border-sidebar-border px-5 py-5"
      >
        <img
          src="/brand-logo.webp"
          alt="Needool"
          width="149"
          height="120"
          className="h-10 w-auto"
        />
      </Link>
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
        <img src={user?.avatar} alt="" className="h-9 w-9 rounded-lg object-cover" />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{user?.name ?? "Guest"}</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/55">
            {state} account
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <SidebarSection
          title="Workspace"
          items={workspaceItems}
          path={path}
          close={() => setOpen(false)}
          badges={{ "/dashboard/notifications": unread }}
        />
        <SidebarSection
          title="Activity"
          items={activityItems}
          path={path}
          close={() => setOpen(false)}
        />
        <SidebarSection
          title="Support"
          items={supportItems}
          path={path}
          close={() => setOpen(false)}
        />
        {user?.accountType === "Business" && (
          <SidebarSection
            title="Business"
            items={businessItems}
            path={path}
            close={() => setOpen(false)}
          />
        )}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <div className="mb-2 flex items-center justify-between border border-sidebar-border px-3 py-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/65">
            Theme
          </span>
          <ThemeToggle />
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden lg:flex w-64 shrink-0">{SidebarBody}</aside>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72">{SidebarBody}</aside>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background px-4 py-3">
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-muted">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/brand-logo.webp"
              alt="Needool"
              width="149"
              height="120"
              className="h-10 w-auto"
            />
          </Link>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        {user && !user.referredBy && (
          <div className="flex items-center gap-4 border-b border-amber-500/20 bg-amber-500/8 px-4 py-2.5 text-sm">
            <span className="text-foreground">
              Have a referral code from someone who invited you?{" "}
              <Link
                to="/dashboard/profile"
                className="font-semibold text-amber-600 hover:underline dark:text-amber-400"
              >
                Add it to your profile →
              </Link>
            </span>
          </div>
        )}
        {children}
      </div>
    </div>
  );
});

function SidebarSection({
  title,
  items,
  path,
  close,
  badges,
}: {
  title: string;
  items: DashboardItem[];
  path: string;
  close: () => void;
  badges?: Record<string, number>;
}) {
  return (
    <div className="mb-6">
      <div className="px-3 pb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-sidebar-foreground/55">
        {title}
      </div>
      <div className="space-y-0.5">
        {items.map((it) => {
          const active = path === it.to;
          const badge = badges?.[it.to];
          return (
            <Link
              key={it.label}
              to={it.to}
              onClick={close}
              className={`relative flex items-center gap-3 py-2.5 pr-3 text-sm transition-colors ${
                active
                  ? "pl-[14px] font-semibold text-sidebar-foreground"
                  : "pl-4 text-sidebar-foreground/75 hover:text-sidebar-foreground"
              }`}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 bg-primary"
                />
              )}
              <it.icon className="h-4 w-4 shrink-0 opacity-80" />
              <span className="flex-1">{it.label}</span>
              {badge && badge > 0 ? (
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                  {badge > 99 ? "99+" : badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
