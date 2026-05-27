import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  User,
  Users,
  Bell,
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
  WifiOff,
  Lock,
} from "lucide-react";
import { memo, useState, useEffect, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/nav/ThemeToggle";
import { getDashboardDebugSnapshot, recordDashboardEvent } from "@/lib/dashboard-debug";

type DashboardItem = {
  label: string;
  icon: typeof LayoutDashboard;
  to: string;
};

const individualItems: DashboardItem[] = [
  { label: "Main", to: "/dashboard", icon: LayoutDashboard },
  { label: "Profile", to: "/dashboard/profile", icon: User },
  { label: "Referrals", to: "/dashboard/referrals", icon: Users },
  { label: "Notifications", to: "/dashboard/notifications", icon: Bell },
  { label: "Needs", to: "/dashboard/needs", icon: ClipboardList },
  { label: "Opportunities", to: "/dashboard/opportunities", icon: Sparkles },
  { label: "Job Openings", to: "/dashboard/jobs", icon: Briefcase },
  { label: "Events", to: "/dashboard/events", icon: Calendar },
  { label: "Reviews", to: "/dashboard/reviews", icon: Star },
  { label: "Help & Guide", to: "/dashboard/help", icon: HelpCircle },
];

const businessItems: DashboardItem[] = [
  { label: "Business Profile", to: "/dashboard/business-profile", icon: Building2 },
  { label: "Services", to: "/dashboard/services", icon: Wrench },
  { label: "Team", to: "/dashboard/team", icon: Users },
  { label: "Leads", to: "/dashboard/leads", icon: MessageSquare },
  { label: "Analytics", to: "/dashboard/analytics", icon: ChartNoAxesCombined },
];

export const DashboardLayout = memo(function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { user, state, logout, loading, needsOnboarding, backendError, retrySync, registerProfile } = useAuth();

  const [slowLoad, setSlowLoad] = useState(false);
  const [autoRegistering, setAutoRegistering] = useState(false);

  useEffect(() => {
    if (!loading) {
      setSlowLoad(false);
      return;
    }
    const t = setTimeout(() => setSlowLoad(true), 6_000);
    return () => clearTimeout(t);
  }, [loading]);

  useEffect(() => {
    if (!needsOnboarding || autoRegistering) return;
    setAutoRegistering(true);
    const savedRef =
      typeof window !== "undefined"
        ? (window.sessionStorage.getItem("ndl_ref") ?? undefined)
        : undefined;
    registerProfile({
      accountType: "Individual",
      referralCode: savedRef ? savedRef.trim().toUpperCase() : undefined,
    })
      .then(() => {
        if (savedRef && typeof window !== "undefined") {
          window.sessionStorage.removeItem("ndl_ref");
        }
      })
      .catch(() => {
        setAutoRegistering(false);
      });
  }, [needsOnboarding, autoRegistering, registerProfile]);

  async function copyDebugReport() {
    const report = JSON.stringify(getDashboardDebugSnapshot(), null, 2);
    try {
      await navigator.clipboard.writeText(report);
      recordDashboardEvent("dashboard:debug-copy-success", { path });
    } catch {
      recordDashboardEvent("dashboard:debug-copy-failed", { path });
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        {slowLoad && (
          <p className="text-sm text-muted-foreground">Server is starting up, please wait…</p>
        )}
      </div>
    );
  }

  if (backendError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <div className="inline-flex rounded-2xl bg-destructive/10 p-4 text-destructive">
          <WifiOff className="h-7 w-7" />
        </div>
        <p className="text-base font-semibold text-foreground">Connection problem</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Could not reach the server. Check your connection and try again.
        </p>
        <button
          onClick={retrySync}
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={copyDebugReport}
          className="rounded-xl px-4 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Copy debug report
        </button>
      </div>
    );
  }

  if (needsOnboarding || autoRegistering) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Setting up your account…</p>
      </div>
    );
  }

  if (state === "visitor" && !needsOnboarding) {
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
      <Link to="/" className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
        <img
          src="/brand-logo.webp"
          alt="Needool"
          width="149"
          height="120"
          className="h-12 w-auto"
        />
      </Link>
      <div className="px-3 py-4 flex items-center gap-3 border-b border-sidebar-border">
        <img src={user?.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{user?.name ?? "Guest"}</div>
          <div className="text-xs text-sidebar-foreground/60 capitalize">{state} account</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <SidebarSection
          title="Individual"
          items={individualItems}
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
      <div className="p-3 border-t border-sidebar-border">
        <div className="mb-2 flex items-center justify-between rounded-xl bg-sidebar-accent/50 px-3 py-2 text-sm">
          <span className="text-sidebar-foreground/75">Theme</span>
          <ThemeToggle />
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/85 hover:bg-sidebar-accent"
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
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/90 backdrop-blur px-4 py-3">
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
        {user?.profileComplete === false && (
          <div className="flex items-center gap-4 border-b border-primary/20 bg-primary/8 px-4 py-2.5 text-sm">
            <span className="text-foreground">
              Your profile is using a generated username.{" "}
              <Link to="/dashboard/profile" className="font-semibold text-primary hover:underline">
                Update your profile →
              </Link>
            </span>
          </div>
        )}
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
}: {
  title: string;
  items: DashboardItem[];
  path: string;
  close: () => void;
}) {
  return (
    <div className="mb-4">
      <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-sidebar-foreground/45">
        {title}
      </div>
      <div className="space-y-0.5">
        {items.map((it) => {
          const active = path === it.to;
          return (
            <Link
              key={it.label}
              to={it.to}
              onClick={close}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                  : "text-sidebar-foreground/85 hover:bg-sidebar-accent"
              }`}
            >
              <it.icon className="h-4 w-4" />
              {it.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
