import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, User, Users, Bell, ClipboardList, Briefcase,
  Calendar, Star, HelpCircle, Menu, X, LogOut, Sparkles,
  Building2, Wrench, MessageSquare, ChartNoAxesCombined, UserPlus,
} from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/nav/ThemeToggle";

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

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { user, state, logout, loading, needsOnboarding, registerProfile } = useAuth();

  const [onboardForm, setOnboardForm] = useState({
    username: "",
    accountType: "Individual" as "Individual" | "Business",
    referralCode: "",
  });
  const [onboardError, setOnboardError] = useState("");
  const [onboardLoading, setOnboardLoading] = useState(false);

  async function submitOnboarding(e: FormEvent) {
    e.preventDefault();
    setOnboardError("");
    setOnboardLoading(true);
    try {
      await registerProfile({
        username: onboardForm.username,
        accountType: onboardForm.accountType,
        referralCode: onboardForm.referralCode || undefined,
      });
    } catch (err) {
      setOnboardError(err instanceof Error ? err.message : "Could not save profile. Please try again.");
    } finally {
      setOnboardLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const SidebarBody = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <Link to="/" className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
        <img src="/brand-logo.webp" alt="Needool" width="149" height="120" className="h-12 w-auto" />
      </Link>
      <div className="px-3 py-4 flex items-center gap-3 border-b border-sidebar-border">
        <img src={user?.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{user?.name ?? "Guest"}</div>
          <div className="text-xs text-sidebar-foreground/60 capitalize">{state} account</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <SidebarSection title="Individual" items={individualItems} path={path} close={() => setOpen(false)} />
        {user?.accountType === "Business" && (
          <SidebarSection title="Business" items={businessItems} path={path} close={() => setOpen(false)} />
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
      {needsOnboarding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="surface-elevated w-full max-w-md rounded-2xl p-6">
            <div className="inline-flex rounded-xl bg-primary/15 p-2 text-primary mb-4">
              <UserPlus className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-extrabold text-foreground">Complete your profile</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              One more step — choose a username to finish setting up your Needool account.
            </p>
            <form onSubmit={submitOnboarding} className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-semibold">
                Username
                <input
                  className="min-h-11 rounded-xl border border-border bg-secondary px-3 py-2.5 font-normal outline-none focus:border-primary"
                  value={onboardForm.username}
                  onChange={(e) =>
                    setOnboardForm({ ...onboardForm, username: e.target.value.toLowerCase().replace(/\s/g, "") })
                  }
                  autoComplete="username"
                  required
                  autoFocus
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Account type
                <select
                  className="min-h-11 rounded-xl border border-border bg-secondary px-3 py-2.5 font-normal outline-none focus:border-primary"
                  value={onboardForm.accountType}
                  onChange={(e) =>
                    setOnboardForm({ ...onboardForm, accountType: e.target.value as "Individual" | "Business" })
                  }
                >
                  <option>Individual</option>
                  <option>Business</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Referral code
                <input
                  className="min-h-11 rounded-xl border border-border bg-secondary px-3 py-2.5 font-normal uppercase outline-none focus:border-primary"
                  placeholder="Optional"
                  value={onboardForm.referralCode}
                  onChange={(e) => setOnboardForm({ ...onboardForm, referralCode: e.target.value })}
                />
              </label>
              {onboardError && (
                <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {onboardError}
                </p>
              )}
              <button
                type="submit"
                disabled={onboardLoading}
                className="min-h-11 w-full rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary/90 disabled:opacity-60 disabled:translate-y-0"
              >
                {onboardLoading ? "Saving…" : "Complete setup"}
              </button>
            </form>
          </div>
        </div>
      )}

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
            <img src="/brand-logo.webp" alt="Needool" width="149" height="120" className="h-10 w-auto" />
          </Link>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

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
      <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-sidebar-foreground/45">{title}</div>
      <div className="space-y-0.5">
        {items.map((it) => {
          const active = path === it.to;
          return (
            <a
              key={it.label}
              href={it.to}
              onClick={close}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                  : "text-sidebar-foreground/85 hover:bg-sidebar-accent"
              }`}
            >
              <it.icon className="h-4 w-4" />
              {it.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}
