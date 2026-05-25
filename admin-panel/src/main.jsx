import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ClerkLoaded, ClerkLoading, ClerkProvider, SignIn, UserButton, useAuth, useUser } from "@clerk/clerk-react";
import {
  Activity,
  BadgeDollarSign,
  BookOpenText,
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileClock,
  Gauge,
  MessageSquareWarning,
  Settings2,
  ShieldCheck,
  Moon,
  Sun,
  Users,
  WalletCards,
} from "lucide-react";
import "./styles.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4100";
const PUBLIC_SITE_URL = import.meta.env.VITE_PUBLIC_SITE_URL ?? "http://localhost:3000";
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? "";
const ADMIN_ALLOWED_EMAILS = (import.meta.env.VITE_ADMIN_ALLOWED_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

async function apiGet(path, token) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });
  return response.json();
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: Gauge },
  { id: "users", label: "Users", icon: Users },
  { id: "approvals", label: "Approvals", icon: ClipboardCheck },
  { id: "hire-requests", label: "Hire Requests", icon: FileClock },
  { id: "jobs", label: "Job Openings", icon: BriefcaseBusiness },
  { id: "events", label: "Events", icon: CalendarDays },
  { id: "reviews", label: "Reviews", icon: MessageSquareWarning },
  { id: "withdrawals", label: "Withdrawals", icon: WalletCards },
  { id: "help-cms", label: "Help CMS", icon: BookOpenText },
  { id: "settings", label: "Settings", icon: Settings2 },
  { id: "audit-log", label: "Audit Log", icon: Activity },
];

const stats = [
  ["Total users", "412", "+38 this week"],
  ["Active subscribers", "128", "31% active"],
  ["Pending approvals", "17", "Needs, opportunities, events"],
  ["Revenue MTD", "$2,840", "Dummy NowPayments"],
  ["User balance held", "214.20 USDT", "Referral wallet"],
  ["Withdrawals pending", "4", "Manual payout"],
];

const tables = {
  users: {
    title: "Users",
    subtitle: "Search, inspect, restrict, ban, and reactivate accounts.",
    columns: ["User", "Type", "Status", "Location", "Action"],
    rows: [
      ["ada.codes", "Individual", "Active", "Ikeja, Lagos", "View profile"],
      ["brightpath", "Business", "Active", "Nairobi, Kenya", "Restrict module"],
      ["studio.noir", "Business", "Inactive", "Berlin, Germany", "Notify when active"],
      ["demo.suspended", "Individual", "Banned", "Abuja, Nigeria", "Review ban"],
    ],
  },
  approvals: {
    title: "Post Approvals",
    subtitle: "Moderate Need Requests, Opportunities, and admin-pinned content.",
    columns: ["Post", "Type", "Author", "Status", "Action"],
    rows: [
      ["Emergency plumber in Lekki", "Need Request", "tobi.a", "Pending", "Approve or reject"],
      ["SME partnership call", "Opportunity", "growthhub", "Pending", "Request edit"],
      ["Lagos creator micro-grant", "Opportunity", "needool", "Pinned", "Unpin"],
      ["React dashboard build", "Need Request", "paylink", "Approved", "Close"],
    ],
  },
  "hire-requests": {
    title: "Hire Requests",
    subtitle: "Manage public employer requests, quotes, payment status, and draft promotion.",
    columns: ["Employer", "Role", "Quote", "Payment", "Action"],
    rows: [
      ["Lina Health", "Frontend Engineer", "$750 sent", "Paid", "Promote to draft job"],
      ["Brightline Ltd", "Operations Associate", "$500 sent", "Awaiting payment", "Send reminder"],
      ["Kobo Studio", "Motion Designer", "Needs quote", "Not started", "Build quote"],
      ["PayLink", "Backend Engineer", "$1,200 sent", "Expired", "Cancel quote"],
    ],
  },
  jobs: {
    title: "Job Openings",
    subtitle: "Publish openings, review applicants, score candidates, and mark Verified Hires.",
    columns: ["Opening", "Status", "Applicants", "Top score", "Action"],
    rows: [
      ["Frontend Engineer", "Open", "18", "92", "Review shortlist"],
      ["Operations Associate", "Draft", "0", "-", "Publish"],
      ["Community Manager", "Closed", "43", "88", "Mark hired"],
      ["Field Sales Lead", "Open", "9", "79", "Edit questions"],
    ],
  },
  events: {
    title: "Events",
    subtitle: "Admin-only event posting for online and physical Needool events.",
    columns: ["Event", "Type", "Scope", "Status", "Action"],
    rows: [
      ["Needool Lagos provider clinic", "Physical", "Lagos", "Open", "Edit"],
      ["Winning verified hire profiles", "Online", "Worldwide", "Open", "Pin"],
      ["Abuja launch mixer", "Physical", "Abuja", "Draft", "Publish"],
      ["Safety for home services", "Online", "Nigeria", "Closed", "Reopen"],
    ],
  },
  reviews: {
    title: "Reviews Moderation",
    subtitle: "Handle reported reviews, held low-star reviews, and Trigger-B pre-approval.",
    columns: ["Review", "Trigger", "Rating", "Status", "Action"],
    rows: [
      ["Poor work quality claim", "Member", "1 star", "Held", "Approve or delete"],
      ["Delivered early", "Verified Hire", "5 stars", "Live", "View"],
      ["Suspicious referral ring", "Member", "5 stars", "Flagged", "Investigate"],
      ["Evidence link missing", "Member", "2 stars", "Rejected", "Request evidence"],
    ],
  },
  withdrawals: {
    title: "Withdrawals",
    subtitle: "Manual USDT TRC20 withdrawal review and payout recording.",
    columns: ["User", "Amount", "TOTP", "Status", "Action"],
    rows: [
      ["ada.codes", "24.20 USDT", "Passed", "Pending", "Approve"],
      ["brightpath", "80.00 USDT", "Passed", "Approved", "Paste tx hash"],
      ["kemi.designs", "18.00 USDT", "Failed minimum", "Blocked", "Notify"],
      ["fixit.lagos", "21.40 USDT", "Passed", "Completed", "View tx"],
    ],
  },
  "help-cms": {
    title: "Help CMS",
    subtitle: "Create and publish public Help & Guide articles.",
    columns: ["Article", "Category", "Status", "Updated", "Action"],
    rows: [
      ["How account states work", "Accounts", "Published", "Today", "Edit"],
      ["How subscription stacking works", "Billing", "Published", "Yesterday", "Edit"],
      ["How reviews stay trustworthy", "Trust", "Draft", "2 days ago", "Publish"],
      ["Withdrawal safety rules", "Wallet", "Review", "3 days ago", "Approve"],
    ],
  },
  "audit-log": {
    title: "Audit Log",
    subtitle: "Every admin action is recorded with actor, timestamp, target, and metadata.",
    columns: ["Time", "Admin", "Action", "Target", "Metadata"],
    rows: [
      ["10:42", "Owner", "Toggled feature flag", "Trigger-B", "enabled=true"],
      ["09:18", "General Admin", "Approved post", "Need n1", "scope=Lagos"],
      ["Yesterday", "Super Admin", "Completed withdrawal", "w4", "tx=0x123...demo"],
      ["May 22", "Owner", "Pinned event", "e1", "scope=Lagos"],
    ],
  },
};

const settingsRows = [
  ["Trigger-B member reviews", "Enabled", "Owner can disable without deploy"],
  ["Daily Polygon anchoring", "Enabled", "Server wallet placeholder"],
  ["AI moderation", "Disabled", "Out of scope for v3.0"],
  ["NowPayments checkout", "Dummy", "Awaiting production API keys"],
  ["Resend email", "Dummy", "Templates mapped, no key installed"],
];

function getCurrentPage() {
  return window.location.hash.replace("#/", "") || "dashboard";
}

function App() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [page, setPage] = useState(getCurrentPage);
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useThemeMode();
  const [overview, setOverview] = useState(null);
  const [localUsers, setLocalUsers] = useState([]);
  const [adminEvents, setAdminEvents] = useState([]);
  const [adminError, setAdminError] = useState("");

  const signedInEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? "";
  const isAllowedAdmin = ADMIN_ALLOWED_EMAILS.length === 0 || ADMIN_ALLOWED_EMAILS.includes(signedInEmail);

  useEffect(() => {
    const onHashChange = () => setPage(getCurrentPage());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (!isAllowedAdmin) return;

    async function loadAdminData() {
      try {
        const token = await getToken();
        const [overviewRes, usersRes, eventsRes] = await Promise.all([
          apiGet("/api/admin/overview", token),
          apiGet("/api/admin/users", token),
          apiGet("/api/admin/events", token),
        ]);
        if (overviewRes.error || usersRes.error || eventsRes.error) {
          setAdminError(overviewRes.error || usersRes.error || eventsRes.error);
          return;
        }
        setAdminError("");
        setOverview(overviewRes.data);
        setLocalUsers(usersRes.data ?? []);
        setAdminEvents(eventsRes.data ?? []);
      } catch {
        // Keep static mock data visible if the local backend is down.
      }
    }
    loadAdminData();
    const timer = window.setInterval(loadAdminData, 5000);
    return () => window.clearInterval(timer);
  }, [getToken, isAllowedAdmin]);

  const current = useMemo(() => navItems.find((item) => item.id === page) ?? navItems[0], [page]);
  const dynamicUsersConfig = useMemo(() => ({
    ...tables.users,
    rows: localUsers.length
      ? localUsers.map((user) => [
          user.username,
          user.accountType,
          user.status,
          user.referredBy ? `Referred by ${user.referredBy}` : "Direct signup",
          user.referralCode,
        ])
      : tables.users.rows,
  }), [localUsers]);
  const pageConfig = current.id === "users" ? dynamicUsersConfig : tables[current.id];

  if (!isAllowedAdmin) {
    return <AccessDenied email={signedInEmail} />;
  }

  return (
    <div className={`admin-shell ${collapsed ? "is-collapsed" : ""}`}>
      <Sidebar collapsed={collapsed} currentPage={current.id} onToggle={() => setCollapsed((value) => !value)} />
      <div className="admin-main">
        <TopBar title={current.label} theme={theme} onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")} />
        <main className="content">
          {adminError && <div className="auth-warning">{adminError}</div>}
          {current.id === "dashboard" ? <Dashboard overview={overview} adminEvents={adminEvents} /> : current.id === "settings" ? <Settings /> : <DataPage config={pageConfig} />}
        </main>
        <AdminFooter />
      </div>
    </div>
  );
}

function AdminAuthGate() {
  const [theme, setTheme] = useThemeMode();
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return <LoadingScreen message="Checking admin session..." />;
  if (!isSignedIn) return <AdminSignIn theme={theme} onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")} />;
  return <App />;
}

function AdminSignIn({ theme, onToggleTheme }) {
  const isDark = theme === "dark";
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand">
          <img className="brand-logo" src="/brand-logo.webp" alt="Needool" width="149" height="120" />
          <button className="theme-btn" type="button" onClick={onToggleTheme} aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
        <div>
          <p className="eyebrow">Admin access</p>
          <h1>Sign in to Needool Admin</h1>
          <p>Only approved administrator accounts can open the operations console.</p>
        </div>
        <SignIn signUpUrl={undefined} appearance={{ elements: { rootBox: "clerk-root", cardBox: "clerk-card" } }} />
      </section>
    </main>
  );
}

function AccessDenied({ email }) {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <img className="brand-logo" src="/brand-logo.webp" alt="Needool" width="149" height="120" />
        <p className="eyebrow">Access blocked</p>
        <h1>This account is not an admin</h1>
        <p>{email ? `${email} is signed in, but it is not on the Needool admin allowlist.` : "This signed-in account is not on the Needool admin allowlist."}</p>
        <UserButton afterSignOutUrl="/" />
      </section>
    </main>
  );
}

function LoadingScreen({ message }) {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <img className="brand-logo" src="/brand-logo.webp" alt="Needool" width="149" height="120" />
        <p>{message}</p>
      </section>
    </main>
  );
}

function getInitialTheme() {
  const saved = window.localStorage.getItem("needool-theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function useThemeMode() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem("needool-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (window.localStorage.getItem("needool-theme")) return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setTheme(query.matches ? "dark" : "light");
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return [theme, setTheme];
}

function Sidebar({ collapsed, currentPage, onToggle }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <img className="brand-logo" src="/brand-logo.webp" alt="Needool" width="149" height="120" />
        {!collapsed && (
          <div>
            <h1>Needool Admin</h1>
            <p>Operations console</p>
          </div>
        )}
      </div>
      <button className="collapse-btn" type="button" onClick={onToggle}>
        {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /> <span>Collapse</span></>}
      </button>
      <nav className="side-nav" aria-label="Admin navigation">
        {navItems.map((item) => (
          <a className={currentPage === item.id ? "active" : ""} href={`#/${item.id}`} key={item.id} title={item.label}>
            <span><item.icon size={17} /></span>
            {!collapsed && <strong>{item.label}</strong>}
          </a>
        ))}
      </nav>
    </aside>
  );
}

function TopBar({ title, theme, onToggleTheme }) {
  const isDark = theme === "dark";
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Dummy admin setup</p>
        <h2>{title}</h2>
      </div>
      <div className="top-actions">
        <input aria-label="Search admin data" placeholder="Search users, posts, jobs..." />
        <button className="theme-btn" type="button" onClick={onToggleTheme} aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}>
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <UserButton afterSignOutUrl="/" />
        <button><ShieldCheck size={16} /> Owner mode</button>
      </div>
    </header>
  );
}

function Dashboard({ overview, adminEvents }) {
  const dashboardStats = overview
    ? [
        ["Total users", String(overview.users), "Local backend store"],
        ["Active subscribers", String(overview.activeSubscribers), "Active or trial users"],
        ["New registrations", String(overview.newRegistrations), "Admin registration events"],
        ["Referral signups", String(overview.referralRegistrations), "Used referral code"],
        ["Revenue MTD", "$2,840", "Dummy NowPayments"],
        ["Withdrawals pending", String(overview.withdrawalsPending), "Manual payout"],
      ]
    : stats;

  return (
    <>
      <section className="intro-panel">
        <div>
          <h3>Admin dashboard</h3>
          <p>
            A complete mock operations dashboard for the Needool MVP: moderation, subscriptions, referrals, jobs, reviews,
            withdrawals, help content, feature flags, and audit logging.
          </p>
        </div>
        <a href="#/approvals"><BadgeDollarSign size={16} /> Review pending queues</a>
      </section>
      <section className="stats">
        {dashboardStats.map(([label, value, hint]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{hint}</small>
          </article>
        ))}
      </section>
      <section className="grid-two">
        <DataPage config={{ ...tables.approvals, title: "Priority approvals", rows: tables.approvals.rows.slice(0, 3) }} compact />
        <DataPage
          config={{
            title: "Registration activity",
            subtitle: "Admin-visible local signup and referral events.",
            columns: ["Time", "Type", "Message"],
            rows: adminEvents.length
              ? adminEvents.slice(0, 5).map((event) => [new Date(event.createdAt).toLocaleString(), event.type, event.message])
              : [["-", "No events", "Create a signup from the public app to populate this queue."]],
          }}
          compact
        />
      </section>
    </>
  );
}

function DataPage({ config, compact = false }) {
  if (!config) return null;
  return (
    <section className={`panel ${compact ? "compact" : ""}`}>
      <div className="panel-title">
        <div>
          <h3>{config.title}</h3>
          <p>{config.subtitle}</p>
        </div>
        {!compact && <button>New record</button>}
      </div>
      <div className="table">
        <div className="row head" style={{ gridTemplateColumns: `repeat(${config.columns.length}, minmax(140px, 1fr))` }}>
          {config.columns.map((column) => <span key={column}>{column}</span>)}
        </div>
        {config.rows.map((row) => (
          <div className="row" key={row.join("-")} style={{ gridTemplateColumns: `repeat(${config.columns.length}, minmax(140px, 1fr))` }}>
            {row.map((cell, index) => (
              <span key={`${cell}-${index}`}><b>{index === 2 ? cell : null}</b>{index === 2 ? null : cell}</span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function Settings() {
  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <h3>Settings and feature flags</h3>
          <p>Owner-controlled operational switches and integration status.</p>
        </div>
      </div>
      <div className="settings-list">
        {settingsRows.map(([name, status, note]) => (
          <label key={name}>
            <input type="checkbox" defaultChecked={status === "Enabled"} />
            <span>
              <strong>{name}</strong>
              <small>{status} - {note}</small>
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}

function AdminFooter() {
  return (
    <footer className="admin-footer">
      <div>
        <strong>Needool Admin</strong>
        <span>Dummy v3.0 MVP operations environment</span>
      </div>
      <nav>
        <a href="#/settings">Settings</a>
        <a href="#/audit-log">Audit log</a>
        <a href={PUBLIC_SITE_URL}>Public site</a>
        <a href={`${API_BASE}/health`}>API health</a>
      </nav>
    </footer>
  );
}

function MissingClerkConfig() {
  const [theme, setTheme] = useThemeMode();
  const isDark = theme === "dark";

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand">
          <img className="brand-logo" src="/brand-logo.webp" alt="Needool" width="149" height="120" />
          <button className="theme-btn" type="button" onClick={() => setTheme(isDark ? "light" : "dark")} aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
        <p className="eyebrow">Setup required</p>
        <h1>Clerk is not configured</h1>
        <p>Add VITE_CLERK_PUBLISHABLE_KEY to the admin panel environment before deploying admin.needol.com.</p>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  CLERK_PUBLISHABLE_KEY ? (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} signInFallbackRedirectUrl="/" afterSignOutUrl="/">
      <ClerkLoading>
        <LoadingScreen message="Loading admin authentication..." />
      </ClerkLoading>
      <ClerkLoaded>
        <AdminAuthGate />
      </ClerkLoaded>
    </ClerkProvider>
  ) : (
    <MissingClerkConfig />
  ),
);
