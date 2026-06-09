import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ClerkProvider,
  SignIn,
  useAuth as useClerkAuth,
  useUser,
} from "@clerk/clerk-react";
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
  LogOut,
  Menu,
  MessageSquareWarning,
  Settings2,
  ShieldCheck,
  Moon,
  Sun,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import "./styles.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4100";
const PUBLIC_SITE_URL = import.meta.env.VITE_PUBLIC_SITE_URL ?? "http://localhost:3000";
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const ADMIN_ALLOWED_EMAILS = String(import.meta.env.VITE_ADMIN_ALLOWED_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

async function apiRequest(method, path, getToken, body) {
  const headers = { "content-type": "application/json" };
  if (getToken) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const parsed = text ? safeParseJson(text) : null;
  if (!response.ok) {
    const err = new Error((parsed && parsed.error) || `${method} ${path} failed: ${response.status}`);
    err.status = response.status;
    throw err;
  }
  return parsed;
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const apiGet = (path, getToken) => apiRequest("GET", path, getToken);
const apiPatch = (path, getToken, body) => apiRequest("PATCH", path, getToken, body);

const navSections = [
  {
    label: "Platform",
    items: [
      { id: "dashboard",    label: "Dashboard",     icon: Gauge },
      { id: "users",        label: "Users",          icon: Users },
      { id: "approvals",    label: "Approvals",      icon: ClipboardCheck },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "hire-requests",label: "Hire Requests",  icon: FileClock },
      { id: "jobs",         label: "Job Openings",   icon: BriefcaseBusiness },
      { id: "events",       label: "Events",         icon: CalendarDays },
      { id: "reviews",      label: "Reviews",        icon: MessageSquareWarning },
      { id: "withdrawals",  label: "Withdrawals",    icon: WalletCards },
    ],
  },
  {
    label: "System",
    items: [
      { id: "help-cms",     label: "Help CMS",       icon: BookOpenText },
      { id: "settings",     label: "Settings",       icon: Settings2 },
      { id: "audit-log",    label: "Audit Log",      icon: Activity },
    ],
  },
];

const navItems = navSections.flatMap((s) => s.items);

const STATUS_BADGE = {
  active:     "badge badge-success",
  approved:   "badge badge-success",
  live:       "badge badge-success",
  published:  "badge badge-success",
  open:       "badge badge-success",
  completed:  "badge badge-success",
  paid:       "badge badge-success",
  passed:     "badge badge-success",
  pending:    "badge badge-warning",
  draft:      "badge badge-warning",
  awaiting:   "badge badge-warning",
  held:       "badge badge-warning",
  review:     "badge badge-warning",
  "needs quote": "badge badge-warning",
  banned:     "badge badge-danger",
  blocked:    "badge badge-danger",
  rejected:   "badge badge-danger",
  expired:    "badge badge-danger",
  failed:     "badge badge-danger",
  "failed minimum": "badge badge-danger",
  restricted: "badge badge-warning",
  inactive:   "badge badge-muted",
  closed:     "badge badge-muted",
  disabled:   "badge badge-muted",
  dummy:      "badge badge-muted",
  pinned:     "badge badge-accent",
  flagged:    "badge badge-accent",
};

function cellContent(value) {
  if (value === null || value === undefined) return null;
  const str = String(value);
  const lower = str.toLowerCase().trim();
  if (STATUS_BADGE[lower]) {
    return <span className={STATUS_BADGE[lower]}>{str}</span>;
  }
  if (/^\$[\d,]+(\.\d+)?$|[\d,]+(\.\d+)?\s*(usdt|usd|%)/i.test(str)) {
    return <span className="mono">{str}</span>;
  }
  return str;
}

// Static placeholder tables for modules we haven't built yet (Phase 2-4).
const placeholderTables = {
  "hire-requests": {
    title: "Hire Requests",
    subtitle: "Public hire-request inbox lands here once Phase 2 ships.",
    columns: ["Employer", "Role", "Quote", "Payment", "Action"],
    rows: [
      ["Lina Health", "Frontend Engineer", "$750 sent", "Paid", "Promote to draft job"],
      ["Brightline Ltd", "Operations Associate", "$500 sent", "Awaiting payment", "Send reminder"],
    ],
    note: "Phase 2 will wire this to /api/admin/hire-requests.",
  },
  jobs: {
    title: "Job Openings",
    subtitle: "Publish openings, review applicants, score candidates, and mark Verified Hires.",
    columns: ["Opening", "Status", "Applicants", "Top score", "Action"],
    rows: [["Frontend Engineer", "Open", "18", "92", "Review shortlist"]],
    note: "Phase 2 will wire this to /api/admin/job-openings.",
  },
  events: {
    title: "Events",
    subtitle: "Admin-posted events. Phase 1.5 follow-up will add the create form.",
    columns: ["Title", "Type", "Scope", "Status", "Action"],
    rows: [],
    note: "Currently live: /api/events GET returns admin-approved kind='event' rows.",
  },
  reviews: {
    title: "Reviews Moderation",
    subtitle: "Held + flagged reviews show here once Phase 2/4 land.",
    columns: ["Review", "Trigger", "Rating", "Status", "Action"],
    rows: [],
    note: "Phase 2: Trigger A. Phase 4: Trigger B anti-abuse queue.",
  },
  withdrawals: {
    title: "Withdrawals",
    subtitle: "Manual USDT TRC20 payout queue (Phase 3).",
    columns: ["User", "Amount", "TOTP", "Status", "Action"],
    rows: [],
    note: "Phase 3 will wire this to /api/admin/withdrawals.",
  },
  "help-cms": {
    title: "Help CMS",
    subtitle: "Markdown article create/edit/publish (Phase 4).",
    columns: ["Article", "Category", "Status", "Updated", "Action"],
    rows: [],
    note: "Phase 4 will wire this to /api/admin/help-articles.",
  },
  "audit-log": {
    title: "Audit Log",
    subtitle: "Every admin action recorded (Phase 4).",
    columns: ["Time", "Admin", "Action", "Target", "Metadata"],
    rows: [],
    note: "Phase 4 introduces the audit-log middleware.",
  },
};

function getCurrentPage() {
  return window.location.hash.replace("#/", "") || "dashboard";
}

function App({ user, onSignOut }) {
  const [page, setPage] = useState(getCurrentPage);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [theme, setTheme] = useThemeMode();
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [pendingNeeds, setPendingNeeds] = useState([]);
  const [pendingOpportunities, setPendingOpportunities] = useState([]);
  const [adminError, setAdminError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    const onHashChange = () => setPage(getCurrentPage());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const { getToken } = useClerkAuth();

  const loadAll = useCallback(async () => {
    try {
      const [overviewRes, usersRes, needsRes, oppsRes] = await Promise.all([
        apiGet("/api/admin/overview", getToken),
        apiGet("/api/admin/users", getToken),
        apiGet("/api/admin/posts?status=pending&kind=need", getToken),
        apiGet("/api/admin/posts?status=pending&kind=opportunity", getToken),
      ]);
      setAdminError("");
      setOverview(overviewRes?.data || null);
      setUsers(usersRes?.data ?? []);
      setPendingNeeds(needsRes?.data ?? []);
      setPendingOpportunities(oppsRes?.data ?? []);
    } catch (err) {
      setAdminError(err.message || "Failed to load admin data");
    }
  }, [getToken]);

  useEffect(() => {
    loadAll();
    const timer = window.setInterval(loadAll, 8000);
    return () => window.clearInterval(timer);
  }, [loadAll]);

  function flash(message) {
    setActionMessage(message);
    window.setTimeout(() => setActionMessage(""), 3500);
  }

  async function banUserAction(row) {
    const reason = window.prompt(`Ban ${row.username}? Reason (optional):`);
    if (reason === null) return;
    try {
      await apiPatch(`/api/admin/users/${row.id}`, getToken, { action: "ban", reason: reason || null });
      flash(`Banned ${row.username}.`);
      await loadAll();
    } catch (err) {
      flash(`Failed: ${err.message}`);
    }
  }

  async function restrictUserAction(row) {
    const modulesRaw = window.prompt(
      `Restrict ${row.username} from which modules? comma-separated (allowed: posting, commenting, reviewing)`,
      "posting",
    );
    if (modulesRaw === null) return;
    const modules = modulesRaw.split(",").map((m) => m.trim()).filter(Boolean);
    const reason = window.prompt(`Reason (optional):`) || null;
    try {
      await apiPatch(`/api/admin/users/${row.id}`, getToken, { action: "restrict", modules, reason });
      flash(`Restricted ${row.username}.`);
      await loadAll();
    } catch (err) {
      flash(`Failed: ${err.message}`);
    }
  }

  async function unbanUserAction(row) {
    if (!window.confirm(`Unban ${row.username}?`)) return;
    try {
      await apiPatch(`/api/admin/users/${row.id}`, getToken, { action: "unban" });
      flash(`Unbanned ${row.username}.`);
      await loadAll();
    } catch (err) {
      flash(`Failed: ${err.message}`);
    }
  }

  async function unrestrictUserAction(row) {
    if (!window.confirm(`Lift restrictions on ${row.username}?`)) return;
    try {
      await apiPatch(`/api/admin/users/${row.id}`, getToken, { action: "unrestrict" });
      flash(`Lifted restrictions on ${row.username}.`);
      await loadAll();
    } catch (err) {
      flash(`Failed: ${err.message}`);
    }
  }

  async function approvePostAction(post) {
    try {
      await apiPatch(`/api/admin/posts/${post.id}`, getToken, { action: "approve" });
      flash(`Approved "${post.title}".`);
      await loadAll();
    } catch (err) {
      flash(`Failed: ${err.message}`);
    }
  }

  async function rejectPostAction(post) {
    const reason = window.prompt(`Reject "${post.title}". Reason:`);
    if (reason === null) return;
    try {
      await apiPatch(`/api/admin/posts/${post.id}`, getToken, { action: "reject", reason });
      flash(`Rejected "${post.title}".`);
      await loadAll();
    } catch (err) {
      flash(`Failed: ${err.message}`);
    }
  }

  async function pinPostAction(post) {
    try {
      await apiPatch(`/api/admin/posts/${post.id}`, getToken, { action: post.pinned ? "unpin" : "pin" });
      flash(post.pinned ? `Unpinned.` : `Pinned.`);
      await loadAll();
    } catch (err) {
      flash(`Failed: ${err.message}`);
    }
  }

  const current = useMemo(() => navItems.find((item) => item.id === page) ?? navItems[0], [page]);

  let content = null;
  if (current.id === "dashboard") {
    content = <Dashboard overview={overview} />;
  } else if (current.id === "users") {
    content = (
      <UsersPage
        users={users}
        onBan={banUserAction}
        onUnban={unbanUserAction}
        onRestrict={restrictUserAction}
        onUnrestrict={unrestrictUserAction}
      />
    );
  } else if (current.id === "approvals") {
    content = (
      <ApprovalsPage
        needs={pendingNeeds}
        opportunities={pendingOpportunities}
        onApprove={approvePostAction}
        onReject={rejectPostAction}
        onPin={pinPostAction}
      />
    );
  } else if (current.id === "settings") {
    content = <Settings getToken={getToken} flash={flash} />;
  } else if (current.id === "reviews") {
    content = <ReviewsPage getToken={getToken} flash={flash} />;
  } else if (current.id === "events") {
    content = <EventsPage getToken={getToken} onCreated={loadAll} />;
  } else if (current.id === "hire-requests") {
    content = <HireRequestsPage getToken={getToken} flash={flash} />;
  } else if (current.id === "jobs") {
    content = <JobOpeningsPage getToken={getToken} flash={flash} />;
  } else if (current.id === "audit-log") {
    content = <AuditLogPage getToken={getToken} flash={flash} />;
  } else if (current.id === "withdrawals") {
    content = <WithdrawalsPage getToken={getToken} flash={flash} onChanged={loadAll} />;
  } else if (current.id === "help-cms") {
    content = <HelpCmsPage getToken={getToken} flash={flash} />;
  } else {
    content = <DataPage config={placeholderTables[current.id] || { title: current.label, subtitle: "", columns: [], rows: [] }} />;
  }

  return (
    <div className={`admin-shell ${collapsed ? "is-collapsed" : ""}`}>
      <Sidebar collapsed={collapsed} currentPage={current.id} onToggle={() => setCollapsed((value) => !value)} mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
      {mobileNavOpen && <div className="sidebar-overlay" onClick={() => setMobileNavOpen(false)} />}
      <div className="admin-main">
        <TopBar
          title={current.label}
          theme={theme}
          user={user}
          onSignOut={onSignOut}
          onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
          onMobileNavToggle={() => setMobileNavOpen((v) => !v)}
          mobileNavOpen={mobileNavOpen}
        />
        <main className="content">
          {adminError && <div className="auth-warning">{adminError}</div>}
          {actionMessage && <div className="auth-warning" style={{ background: "rgba(31, 110, 218, 0.1)" }}>{actionMessage}</div>}
          {content}
        </main>
        <AdminFooter />
      </div>
    </div>
  );
}

function AdminAuthGate() {
  const [theme, setTheme] = useThemeMode();
  const { signOut } = useClerkAuth();
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();

  const adminUser = clerkUser
    ? {
        name:
          [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim()
          || clerkUser.username
          || clerkUser.primaryEmailAddress?.emailAddress
          || "Admin",
        email: (clerkUser.primaryEmailAddress?.emailAddress || "").toLowerCase(),
      }
    : null;

  const isAllowed =
    adminUser && (ADMIN_ALLOWED_EMAILS.length === 0 || ADMIN_ALLOWED_EMAILS.includes(adminUser.email));

  if (!isLoaded) {
    return (
      <main className="auth-shell">
        <section className="auth-card" style={{ textAlign: "center" }}>
          <p>Loading…</p>
        </section>
      </main>
    );
  }

  if (!isSignedIn) {
    return (
      <AdminSignInGate
        theme={theme}
        onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
      />
    );
  }

  if (!isAllowed) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="auth-brand">
            <img className="brand-logo" src="/brand-logo.webp" alt="Needool" width="149" height="120" />
          </div>
          <div>
            <p className="eyebrow">Access denied</p>
            <h1>You aren't allowlisted for admin</h1>
            <p>
              <code>{adminUser?.email}</code> is not on <code>VITE_ADMIN_ALLOWED_EMAILS</code>.
              Sign out and use an allowlisted email, or add yours to the list.
            </p>
          </div>
          <button type="button" onClick={() => signOut()}>
            Sign out
          </button>
        </section>
      </main>
    );
  }

  return <App user={adminUser} onSignOut={() => signOut()} />;
}

function AdminSignInGate({ theme, onToggleTheme }) {
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
          <p>Only allowlisted emails can open the operations console.</p>
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <SignIn routing="virtual" />
        </div>
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

function Sidebar({ collapsed, currentPage, onToggle, mobileOpen, onMobileClose }) {
  return (
    <aside className={`sidebar${mobileOpen ? " mobile-open" : ""}`}>
      <div className="sidebar-head">
        <img className="brand-logo" src="/brand-logo.webp" alt="Needool" width="149" height="120" />
        {!collapsed && (
          <div>
            <h1>Needool Admin</h1>
            <p>Operations console</p>
          </div>
        )}
        <button className="mobile-close-btn" type="button" onClick={onMobileClose} aria-label="Close navigation">
          <X size={16} />
        </button>
      </div>
      <button className="collapse-btn" type="button" onClick={onToggle}>
        {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /> <span>Collapse</span></>}
      </button>
      <nav className="side-nav" aria-label="Admin navigation">
        {navSections.map((section) => (
          <React.Fragment key={section.label}>
            {!collapsed && <p className="side-nav-section-label">{section.label}</p>}
            {section.items.map((item) => (
              <a
                key={item.id}
                className={currentPage === item.id ? "active" : ""}
                href={`#/${item.id}`}
                title={item.label}
                onClick={onMobileClose}
              >
                <span><item.icon size={16} /></span>
                {!collapsed && <strong>{item.label}</strong>}
              </a>
            ))}
          </React.Fragment>
        ))}
      </nav>
    </aside>
  );
}

function TopBar({ title, theme, user, onSignOut, onToggleTheme, onMobileNavToggle, mobileNavOpen }) {
  const isDark = theme === "dark";
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="mobile-menu-btn" type="button" onClick={onMobileNavToggle} aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}>
          {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <div>
          <p className="eyebrow">Needool Admin</p>
          <h2 className="topbar-page-title">{title}</h2>
        </div>
      </div>
      <div className="top-actions">
        <div className="topbar-btn-group">
          <button className="theme-btn" type="button" onClick={onToggleTheme} aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}>
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          {user && (
            <span className="admin-user-chip" title={user.email}>
              {user.name}
            </span>
          )}
          <button className="btn-secondary btn-sm" type="button" onClick={onSignOut} style={{ gap: 5 }}>
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

const STAT_META = [
  { icon: Users,         cls: "stat-blue" },
  { icon: Activity,      cls: "stat-cyan" },
  { icon: ClipboardCheck,cls: "stat-green" },
  { icon: BadgeDollarSign,cls: "stat-warning" },
  { icon: WalletCards,   cls: "stat-danger" },
  { icon: FileClock,     cls: "stat-muted" },
];

function Dashboard({ overview }) {
  const dashboardStats = overview
    ? [
        ["Total users", String(overview.users ?? 0), `${overview.individualCount ?? 0} ind · ${overview.businessCount ?? 0} biz`],
        ["Active subscribers", String(overview.activeSubscribers ?? 0), "Subscription active"],
        ["Pending approvals", String(overview.pendingApprovals ?? 0), "Needs + Opportunities"],
        ["Revenue MTD", `$${Number(overview.revenueMtd ?? 0).toFixed(2)}`, "From completed payments"],
        ["Banned / Restricted", `${overview.bannedCount ?? 0} / ${overview.restrictedCount ?? 0}`, "Moderation state"],
        ["Withdrawals pending", String(overview.withdrawalsPending ?? 0), "Manual payout queue"],
      ]
    : Array(6).fill(["—", "—", "Loading…"]);

  return (
    <>
      <section className="intro-panel">
        <div>
          <h2>Admin dashboard</h2>
          <p>
            Real-time KPIs pulled from Supabase. Phase 1 wired Users + Approvals + Dashboard counts. Phases 2–4 add hire-requests, withdrawals, reviews, audit log, and notifications.
          </p>
        </div>
        <a href="#/approvals"><BadgeDollarSign size={16} /> Review pending posts</a>
      </section>
      <section className="stats">
        {dashboardStats.map(([label, value, hint], i) => {
          const meta = STAT_META[i] ?? { icon: Gauge, cls: "stat-blue" };
          const Icon = meta.icon;
          return (
            <article key={`${label}-${i}`} className={meta.cls}>
              <div className="stat-header">
                <span>{label}</span>
                <div className="stat-icon"><Icon size={14} /></div>
              </div>
              <strong>{value}</strong>
              <small>{hint}</small>
            </article>
          );
        })}
      </section>
    </>
  );
}

function UsersPage({ users, onBan, onUnban, onRestrict, onUnrestrict }) {
  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <h3>Users</h3>
          <p>Search, inspect, restrict, ban, and reactivate accounts.</p>
        </div>
      </div>
      <div className="table">
        <div className="row head" style={{ gridTemplateColumns: "repeat(6, minmax(140px, 1fr))" }}>
          <span>Username</span><span>Type</span><span>Status</span><span>Referral</span><span>Joined</span><span>Actions</span>
        </div>
        {users.length === 0 && (
          <div className="row" style={{ gridTemplateColumns: "1fr" }}>
            <span style={{ color: "var(--muted)" }}>No users yet.</span>
          </div>
        )}
        {users.map((u) => (
          <div className="row" key={u.id} style={{ gridTemplateColumns: "repeat(6, minmax(140px, 1fr))" }}>
            <span>{u.username}</span>
            <span>{u.accountType}</span>
            <span>{cellContent(u.status)}</span>
            <span>{u.referredBy ? `Referred by ${u.referredBy}` : "Direct signup"}</span>
            <span style={{ color: "var(--muted)", fontSize: 12 }}>{u.referralCode}</span>
            <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {u.status === "banned" ? (
                <button className="btn-secondary btn-sm" onClick={() => onUnban(u)}>Unban</button>
              ) : (
                <button className="btn-secondary btn-sm" onClick={() => onBan(u)}>Ban</button>
              )}
              {u.status === "restricted" ? (
                <button className="btn-secondary btn-sm" onClick={() => onUnrestrict(u)}>Lift restrict</button>
              ) : (
                <button className="btn-secondary btn-sm" onClick={() => onRestrict(u)}>Restrict</button>
              )}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ApprovalsPage({ needs, opportunities, onApprove, onReject, onPin }) {
  const [tab, setTab] = useState("needs");
  const rows = tab === "needs" ? needs : opportunities;

  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <h3>Post approvals</h3>
          <p>Approve / reject pending Need Requests and Opportunities. Pin up to 3 per scope.</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            className={tab === "needs" ? "" : "btn-secondary"}
            onClick={() => setTab("needs")}
          >
            Needs ({needs.length})
          </button>
          <button
            className={tab === "opportunities" ? "" : "btn-secondary"}
            onClick={() => setTab("opportunities")}
          >
            Opportunities ({opportunities.length})
          </button>
        </div>
      </div>
      <div className="table">
        <div className="row head" style={{ gridTemplateColumns: "minmax(220px, 2fr) 1fr 1fr 1fr 1fr" }}>
          <span>Title</span><span>Author</span><span>Scope</span><span>Created</span><span>Actions</span>
        </div>
        {rows.length === 0 && (
          <div className="row" style={{ gridTemplateColumns: "1fr" }}>
            <span style={{ color: "var(--muted)" }}>Nothing pending.</span>
          </div>
        )}
        {rows.map((post) => {
          const scope = [post.scope_city, post.scope_state, post.scope_country].filter(Boolean).join(", ") || post.scope || "—";
          return (
            <div className="row" key={post.id} style={{ gridTemplateColumns: "minmax(220px, 2fr) 1fr 1fr 1fr 1fr" }}>
              <span title={post.description}>
                <strong>{post.title}</strong>
                {post.pinned && <span className="badge badge-accent" style={{ marginLeft: 8 }}>Pinned</span>}
              </span>
              <span style={{ color: "var(--muted)", fontSize: 12 }}>{post.author_id || "—"}</span>
              <span>{scope}</span>
              <span style={{ color: "var(--muted)", fontSize: 12 }}>
                {post.created_at ? new Date(post.created_at).toLocaleString() : "—"}
              </span>
              <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button className="btn-secondary btn-sm" onClick={() => onApprove(post)}>Approve</button>
                <button className="btn-secondary btn-sm" onClick={() => onReject(post)}>Reject</button>
                <button className="btn-secondary btn-sm" onClick={() => onPin(post)}>{post.pinned ? "Unpin" : "Pin"}</button>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function WithdrawalsPage({ getToken, flash, onChanged }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const qs = filter ? `?status=${encodeURIComponent(filter)}` : "";
      const res = await apiGet(`/api/admin/withdrawals${qs}`, getToken);
      setItems(res?.data ?? []);
    } catch (err) {
      setError(err.message || "Failed to load withdrawals.");
    } finally {
      setLoading(false);
    }
  }, [getToken, filter]);

  useEffect(() => { reload(); }, [reload]);

  async function runAction(row, action) {
    const body = { action };
    if (action === "reject") {
      const reason = window.prompt("Reject reason:", "Manual review rejected");
      if (reason === null) return;
      body.reason = reason;
    }
    if (action === "mark-paid") {
      const txHash = window.prompt("TRC20 transaction hash:");
      if (!txHash) return;
      body.txHash = txHash;
    }
    if (action === "fail") {
      const reason = window.prompt("Failure reason:", "Manual payout failed");
      if (reason === null) return;
      body.reason = reason;
    }
    if (action === "approve" && !window.confirm(`Approve ${formatUsdt(row.amount_usdt)} withdrawal?`)) return;

    try {
      await apiPatch(`/api/admin/withdrawals/${row.id}`, getToken, body);
      flash(`Withdrawal ${action.replace("-", " ")} complete.`);
      await reload();
      if (onChanged) await onChanged();
    } catch (err) {
      flash(`Failed: ${err.message}`);
    }
  }

  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <h3>Withdrawals</h3>
          <p>Manual USDT TRC20 payout queue. Approve, reject, then paste the payout tx hash when sent.</p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ minWidth: 140 }}>
          <option value="">All statuses</option>
          {["pending", "approved", "completed", "rejected", "failed"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {error && <p style={{ margin: "0 1rem 1rem", color: "var(--admin-danger)", fontSize: 12 }}>{error}</p>}
      <div className="table">
        <div className="row head" style={{ gridTemplateColumns: "minmax(190px, 1.5fr) 120px minmax(220px, 2fr) 110px 140px 180px" }}>
          <span>User</span><span>Amount</span><span>TRC20 / Tx</span><span>Status</span><span>Created</span><span>Actions</span>
        </div>
        {loading && (
          <div className="row" style={{ gridTemplateColumns: "1fr" }}>
            <span style={{ color: "var(--muted)" }}>Loading...</span>
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="row" style={{ gridTemplateColumns: "1fr" }}>
            <span style={{ color: "var(--muted)" }}>No withdrawals in this view.</span>
          </div>
        )}
        {items.map((row) => {
          const person = row.user || {};
          return (
            <div className="row" key={row.id} style={{ gridTemplateColumns: "minmax(190px, 1.5fr) 120px minmax(220px, 2fr) 110px 140px 180px" }}>
              <span>
                <strong>{person.username || row.user_id}</strong>
                <small style={{ color: "var(--muted)", display: "block", fontSize: 11 }}>{person.email || row.user_id}</small>
              </span>
              <span className="mono">{formatUsdt(row.amount_usdt)}</span>
              <span style={{ minWidth: 0 }}>
                <span className="mono" style={{ overflowWrap: "anywhere", fontSize: 11 }}>
                  {row.tx_hash || row.trc20_address}
                </span>
              </span>
              <span>{cellContent(row.status)}</span>
              <span style={{ color: "var(--muted)", fontSize: 12 }}>{row.created_at ? new Date(row.created_at).toLocaleString() : "-"}</span>
              <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {row.status === "pending" && <button className="btn-secondary btn-sm" onClick={() => runAction(row, "approve")}>Approve</button>}
                {row.status === "pending" && <button className="btn-secondary btn-sm" onClick={() => runAction(row, "reject")}>Reject</button>}
                {row.status === "approved" && <button className="btn-secondary btn-sm" onClick={() => runAction(row, "mark-paid")}>Mark paid</button>}
                {row.status === "approved" && <button className="btn-secondary btn-sm" onClick={() => runAction(row, "fail")}>Fail</button>}
                {row.status === "completed" && row.tx_hash && <span className="badge badge-success">Paid</span>}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function formatUsdt(value) {
  return `${Number(value || 0).toFixed(2)} USDT`;
}

function AuditLogPage({ getToken, flash }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("");
  const [filterActor, setFilterActor] = useState("");
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterAction) params.set("action", filterAction);
      if (filterActor) params.set("actor", filterActor);
      const qs = params.toString();
      const res = await apiGet(`/api/admin/audit-log${qs ? `?${qs}` : ""}`, getToken);
      setRows(res?.data ?? []);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken, filterAction, filterActor]);

  useEffect(() => { reload(); }, [reload]);

  const uniqueActions = useMemo(() => {
    const seen = new Set();
    for (const r of rows) if (r.action) seen.add(r.action);
    return Array.from(seen).sort();
  }, [rows]);

  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <h3>Audit Log</h3>
          <p>Every admin mutation across users, posts, hire requests, job openings, applications, and withdrawals.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            placeholder="Filter by actor email"
            value={filterActor}
            onChange={(e) => setFilterActor(e.target.value)}
            style={{ minWidth: 200 }}
          />
          <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} style={{ minWidth: 160 }}>
            <option value="">All actions</option>
            {uniqueActions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <button className="btn-secondary btn-sm" onClick={() => { setFilterAction(""); setFilterActor(""); }}>Clear</button>
        </div>
      </div>
      {error && <p style={{ color: "var(--danger)", margin: "0 1rem 1rem", fontSize: 12 }}>Failed: {error}</p>}
      <div className="table">
        <div className="row head" style={{ gridTemplateColumns: "180px 160px 200px 1fr 80px" }}>
          <span>When</span><span>Actor</span><span>Action / target</span><span>Metadata</span><span>Status</span>
        </div>
        {loading && <div className="row" style={{ gridTemplateColumns: "1fr" }}><span style={{ color: "var(--muted)" }}>Loading…</span></div>}
        {!loading && rows.length === 0 && <div className="row" style={{ gridTemplateColumns: "1fr" }}><span style={{ color: "var(--muted)" }}>No admin actions match this filter.</span></div>}
        {rows.map((row) => {
          const when = row.created_at ? new Date(row.created_at).toLocaleString() : "—";
          const meta = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
          const slim = JSON.stringify(meta).slice(0, 200);
          return (
            <div className="row" key={row.id} style={{ gridTemplateColumns: "180px 160px 200px 1fr 80px" }}>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{when}</span>
              <span style={{ fontSize: 12 }}>{row.actor_email}</span>
              <span>
                <strong style={{ fontSize: 13 }}>{row.action}</strong>
                {row.target_type && <><br /><span style={{ fontSize: 11, color: "var(--muted)" }}>{row.target_type} · {row.target_id ? row.target_id.slice(0, 8) + "…" : "—"}</span></>}
              </span>
              <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono, ui-monospace)" }} title={slim}>
                {slim || "{}"}
              </span>
              <span>{cellContent(row.status)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HireRequestsPage({ getToken, flash }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const qs = filter ? `?status=${encodeURIComponent(filter)}` : "";
      const res = await apiGet(`/api/admin/hire-requests${qs}`, getToken);
      setItems(res?.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [getToken, filter]);

  useEffect(() => { reload(); }, [reload]);

  async function sendQuote(row) {
    const amountStr = window.prompt(`Quote amount (USD) for "${row.role_title}":`, "500");
    if (amountStr === null) return;
    const amount = Number(amountStr);
    if (!amount || amount <= 0) { flash("Invalid amount."); return; }
    try {
      const res = await apiRequest("POST", `/api/admin/hire-requests/${row.id}/quote`, getToken, { amount });
      const url = res?.data?.invoiceUrl;
      flash(url ? `Quote sent. Invoice URL copied to console.` : `Quote sent.`);
      console.log(`[hire-quote] Invoice URL for ${row.id}:`, url);
      await reload();
    } catch (err) { flash(`Failed: ${err.message}`); }
  }

  async function cancelRequest(row) {
    const reason = window.prompt(`Cancel "${row.role_title}". Reason (optional):`);
    if (reason === null) return;
    try {
      await apiRequest("POST", `/api/admin/hire-requests/${row.id}/cancel`, getToken, { reason });
      flash(`Cancelled.`);
      await reload();
    } catch (err) { flash(`Failed: ${err.message}`); }
  }

  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <h3>Hire Requests</h3>
          <p>Public employer requests. Send a quote, await payment, auto-promote to a draft Job Opening.</p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ minWidth: 120 }}>
          <option value="">All statuses</option>
          {["new", "quoted", "paid", "promoted", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="table">
        <div className="row head" style={{ gridTemplateColumns: "minmax(180px, 1.5fr) 1fr 1fr 1fr 1fr 1fr" }}>
          <span>Employer / Role</span><span>Contact</span><span>Type</span><span>Status</span><span>Quote</span><span>Actions</span>
        </div>
        {loading && <div className="row" style={{ gridTemplateColumns: "1fr" }}><span style={{ color: "var(--muted)" }}>Loading…</span></div>}
        {!loading && items.length === 0 && <div className="row" style={{ gridTemplateColumns: "1fr" }}><span style={{ color: "var(--muted)" }}>No hire requests in this view.</span></div>}
        {items.map((row) => (
          <div className="row" key={row.id} style={{ gridTemplateColumns: "minmax(180px, 1.5fr) 1fr 1fr 1fr 1fr 1fr" }}>
            <span>
              <strong>{row.employer_name}</strong><br />
              <span style={{ color: "var(--muted)", fontSize: 12 }}>{row.role_title} · {row.num_hires} hire(s)</span>
            </span>
            <span style={{ color: "var(--muted)", fontSize: 12 }}>{row.contact_email}</span>
            <span>{row.employment_type}</span>
            <span>{cellContent(row.status)}</span>
            <span style={{ color: "var(--muted)", fontSize: 12 }}>{row.quote_amount_usd ? `$${row.quote_amount_usd}` : "—"}</span>
            <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {row.status === "new" && <button className="btn-secondary btn-sm" onClick={() => sendQuote(row)}>Send quote</button>}
              {(row.status === "new" || row.status === "quoted") && <button className="btn-secondary btn-sm" onClick={() => cancelRequest(row)}>Cancel</button>}
              {row.status === "promoted" && row.promoted_job_opening_id && (
                <a className="btn-secondary btn-sm" href={`#/jobs`} title={row.promoted_job_opening_id} onClick={() => flash(`Draft opening: ${row.promoted_job_opening_id}`)}>Open draft</a>
              )}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function JobOpeningsPage({ getToken, flash }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // { opening, questions }
  const [applicantsOpen, setApplicantsOpen] = useState(null); // openingId

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const qs = filter ? `?status=${encodeURIComponent(filter)}` : "";
      const res = await apiGet(`/api/admin/job-openings${qs}`, getToken);
      setItems(res?.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [getToken, filter]);

  useEffect(() => { reload(); }, [reload]);

  async function openEdit(row) {
    const res = await apiGet(`/api/admin/job-openings?status=${encodeURIComponent(row.status)}`, getToken);
    // We don't have a single GET; piggyback on the list and fetch questions via the public endpoint
    const opening = (res?.data || []).find((o) => o.id === row.id) || row;
    const detail = await fetch(`${API_BASE}/api/jobs/${row.id}`).then(r => r.ok ? r.json() : null).catch(() => null);
    const questions = detail?.data?.questions || [];
    setEditing({ opening, questions });
  }

  async function savePatch(patch, questions) {
    if (!editing) return;
    try {
      await apiRequest("PATCH", `/api/admin/job-openings/${editing.opening.id}`, getToken, { ...patch, questions });
      flash("Saved.");
      setEditing(null);
      await reload();
    } catch (err) { flash(`Failed: ${err.message}`); }
  }

  async function publish(row) {
    if (!window.confirm(`Publish "${row.title}"? It will appear on /jobs.`)) return;
    try { await apiRequest("POST", `/api/admin/job-openings/${row.id}/publish`, getToken); flash("Published."); await reload(); }
    catch (err) { flash(`Failed: ${err.message}`); }
  }
  async function close(row) {
    if (!window.confirm(`Close "${row.title}"?`)) return;
    try { await apiRequest("POST", `/api/admin/job-openings/${row.id}/close`, getToken); flash("Closed."); await reload(); }
    catch (err) { flash(`Failed: ${err.message}`); }
  }

  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <h3>Job Openings</h3>
          <p>Drafts auto-created from paid hire requests. Edit, add screening questions, publish, then review applicants.</p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ minWidth: 120 }}>
          <option value="">All statuses</option>
          {["draft", "open", "closed"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="table">
        <div className="row head" style={{ gridTemplateColumns: "minmax(200px, 2fr) 1fr 1fr 1fr 1fr" }}>
          <span>Title</span><span>Status</span><span>Type</span><span>Created</span><span>Actions</span>
        </div>
        {loading && <div className="row" style={{ gridTemplateColumns: "1fr" }}><span style={{ color: "var(--muted)" }}>Loading…</span></div>}
        {!loading && items.length === 0 && <div className="row" style={{ gridTemplateColumns: "1fr" }}><span style={{ color: "var(--muted)" }}>No openings yet.</span></div>}
        {items.map((row) => (
          <div className="row" key={row.id} style={{ gridTemplateColumns: "minmax(200px, 2fr) 1fr 1fr 1fr 1fr" }}>
            <span><strong>{row.title}</strong>{row.pinned && <span className="badge badge-accent" style={{ marginLeft: 8 }}>Pinned</span>}</span>
            <span>{cellContent(row.status)}</span>
            <span>{row.employment_type}</span>
            <span style={{ color: "var(--muted)", fontSize: 12 }}>{row.created_at ? new Date(row.created_at).toLocaleDateString() : "—"}</span>
            <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button className="btn-secondary btn-sm" onClick={() => openEdit(row)}>Edit</button>
              {row.status === "draft" && <button className="btn-secondary btn-sm" onClick={() => publish(row)}>Publish</button>}
              {row.status === "open" && <button className="btn-secondary btn-sm" onClick={() => close(row)}>Close</button>}
              <button className="btn-secondary btn-sm" onClick={() => setApplicantsOpen(row.id)}>Applicants</button>
            </span>
          </div>
        ))}
      </div>

      {editing && <JobOpeningEditorModal editing={editing} onClose={() => setEditing(null)} onSave={savePatch} />}
      {applicantsOpen && <ApplicantsPanel openingId={applicantsOpen} getToken={getToken} flash={flash} onClose={() => setApplicantsOpen(null)} />}
    </section>
  );
}

function JobOpeningEditorModal({ editing, onClose, onSave }) {
  const [title, setTitle] = useState(editing.opening.title || "");
  const [description, setDescription] = useState(editing.opening.description || "");
  const [instructions, setInstructions] = useState(editing.opening.application_instructions || "");
  const [eligibleType, setEligibleType] = useState(editing.opening.eligible_account_type || "Both");
  const [eligibleLocations, setEligibleLocations] = useState((editing.opening.eligible_locations || []).join(", "));
  const [employmentType, setEmploymentType] = useState(editing.opening.employment_type || "Remote");
  const [questions, setQuestions] = useState(editing.questions.length ? editing.questions.map((q) => q.prompt) : [""]);

  function updateQuestion(i, value) { setQuestions((qs) => qs.map((q, idx) => idx === i ? value : q)); }
  function addQuestion() { setQuestions((qs) => qs.concat([""])); }
  function removeQuestion(i) { setQuestions((qs) => qs.filter((_, idx) => idx !== i)); }

  function handleSave() {
    const patch = {
      title,
      description,
      application_instructions: instructions,
      eligible_account_type: eligibleType,
      eligible_locations: eligibleLocations.split(",").map((s) => s.trim()).filter(Boolean),
      employment_type: employmentType,
    };
    const qRows = questions.filter((q) => q && q.trim()).map((q) => ({ prompt: q.trim() }));
    onSave(patch, qRows);
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", zIndex: 100 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-elev)", padding: 24, borderRadius: 12, maxWidth: 720, width: "90vw", maxHeight: "85vh", overflow: "auto" }}>
        <h3 style={{ marginTop: 0 }}>Edit job opening</h3>
        <div style={{ display: "grid", gap: 12 }}>
          <label><span style={{ fontSize: 12, fontWeight: 600 }}>Title</span><input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <label><span style={{ fontSize: 12, fontWeight: 600 }}>Description</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} /></label>
          <label><span style={{ fontSize: 12, fontWeight: 600 }}>Application instructions</span><textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} /></label>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
            <label><span style={{ fontSize: 12, fontWeight: 600 }}>Eligible account type</span>
              <select value={eligibleType} onChange={(e) => setEligibleType(e.target.value)}>
                {["Both", "Individual", "Business"].map((o) => <option key={o}>{o}</option>)}
              </select>
            </label>
            <label><span style={{ fontSize: 12, fontWeight: 600 }}>Employment type</span>
              <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}>
                {["Remote", "OnSite", "Hybrid"].map((o) => <option key={o}>{o}</option>)}
              </select>
            </label>
          </div>
          <label><span style={{ fontSize: 12, fontWeight: 600 }}>Eligible locations (comma-separated)</span>
            <input value={eligibleLocations} onChange={(e) => setEligibleLocations(e.target.value)} placeholder="Lagos, Nigeria · Worldwide" />
          </label>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, margin: "8px 0" }}>Screening questions ({questions.length})</p>
            {questions.map((q, i) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <input value={q} onChange={(e) => updateQuestion(i, e.target.value)} placeholder={`Question ${i + 1}`} style={{ flex: 1 }} />
                <button type="button" className="btn-secondary btn-sm" onClick={() => removeQuestion(i)}>×</button>
              </div>
            ))}
            <button type="button" className="btn-secondary btn-sm" onClick={addQuestion}>+ Add question</button>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="button" onClick={handleSave}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ApplicantsPanel({ openingId, getToken, flash, onClose }) {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiGet(`/api/admin/job-openings/${openingId}/applicants`, getToken);
      setApplicants(res?.data ?? []);
    } finally { setLoading(false); }
  }, [getToken, openingId]);

  useEffect(() => { reload(); }, [reload]);

  async function action(appId, body) {
    try {
      await apiRequest("PATCH", `/api/admin/applications/${appId}`, getToken, body);
      await reload();
    } catch (err) { flash(`Failed: ${err.message}`); }
  }

  async function score(app) {
    const s = window.prompt("Score (0–100):", String(app.score ?? 0));
    if (s === null) return;
    await action(app.id, { action: "score", score: Number(s) });
    flash(`Scored ${app.id.slice(0, 8)}: ${s}`);
  }

  async function markHired(app) {
    if (!window.confirm("Mark this applicant as Hired? Creates a Verified Hire + employer review token.")) return;
    try {
      const res = await apiRequest("PATCH", `/api/admin/applications/${app.id}`, getToken, { action: "mark-hired" });
      const token = res?.data?.verifiedHire?.employer_review_token;
      const url = token ? `${PUBLIC_SITE_URL}/review-employer/${token}` : "";
      flash(`Hired. Employer review URL logged in console.`);
      console.log(`[mark-hired] Employer review URL:`, url);
      await reload();
    } catch (err) { flash(`Failed: ${err.message}`); }
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", zIndex: 100 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-elev)", padding: 24, borderRadius: 12, maxWidth: 880, width: "90vw", maxHeight: "85vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Applicants</h3>
          <button className="btn-secondary btn-sm" onClick={onClose}>Close</button>
        </div>
        {loading && <p>Loading…</p>}
        {!loading && applicants.length === 0 && <p style={{ color: "var(--muted)" }}>No applicants yet.</p>}
        <div className="table">
          {applicants.map((a) => (
            <div key={a.id} style={{ borderBottom: "1px solid var(--border)", padding: "12px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>{a.snapshot?.name || a.applicant_id}</strong>{" "}
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>· {a.snapshot?.email || ""}</span>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>Score: {a.score ?? "—"} · {cellContent(a.status)}</span>
                  <button className="btn-secondary btn-sm" onClick={() => score(a)}>Score</button>
                  <button className="btn-secondary btn-sm" onClick={() => action(a.id, { action: "shortlist" })}>Shortlist</button>
                  <button className="btn-secondary btn-sm" onClick={() => markHired(a)}>Mark Hired</button>
                  <button className="btn-secondary btn-sm" onClick={() => action(a.id, { action: "reject" })}>Reject</button>
                </div>
              </div>
              {Array.isArray(a.answers) && a.answers.length > 0 && (
                <ul style={{ fontSize: 12, color: "var(--muted)", margin: "8px 0 0", listStyle: "disc", paddingLeft: 18 }}>
                  {a.answers.map((ans, i) => (
                    <li key={i}><strong>{ans.prompt}</strong>: {ans.answer}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EventsPage({ getToken, onCreated }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiGet("/api/admin/posts?status=approved&kind=event", getToken);
      setEvents(res?.data ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function onSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    const fd = new FormData(event.currentTarget);
    const country = String(fd.get("country") || "Worldwide");
    const body = {
      kind: "event",
      title: String(fd.get("title") || "").trim(),
      description: String(fd.get("description") || "").trim(),
      scope: country === "Worldwide" ? "worldwide" : "country",
      scope_country: country === "Worldwide" ? null : country,
      scope_state: String(fd.get("state") || "").trim() || null,
      scope_city: String(fd.get("city") || "").trim() || null,
      payload: {
        type: String(fd.get("type") || "Physical"),
        datetime: String(fd.get("datetime") || "").trim() || null,
      },
      links: [String(fd.get("link") || "").trim()].filter(Boolean).map((url) => ({ title: "Details", url })),
    };
    try {
      await apiRequest("POST", "/api/admin/posts", getToken, body);
      setSuccess("Event published.");
      event.currentTarget.reset();
      await reload();
      if (onCreated) await onCreated();
    } catch (err) {
      setError(err.message || "Failed to create event.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <h3>Events</h3>
          <p>Admin-only event posting. New events are auto-approved.</p>
        </div>
      </div>
      <form
        onSubmit={onSubmit}
        style={{
          display: "grid",
          gap: 12,
          padding: "0 1rem 1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: "1 / -1" }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Title</span>
          <input name="title" required maxLength={80} placeholder="Needool Lagos provider clinic" />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: "1 / -1" }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Description</span>
          <textarea name="description" required rows={4} maxLength={1500} placeholder="What's the event about? Phone/email/URLs auto-stripped." />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Type</span>
          <select name="type" defaultValue="Physical">
            <option>Physical</option>
            <option>Online</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Country</span>
          <select name="country" defaultValue="Worldwide">
            <option>Worldwide</option>
            <option>Nigeria</option>
            <option>Ghana</option>
            <option>Kenya</option>
            <option>South Africa</option>
            <option>United States</option>
            <option>United Kingdom</option>
            <option>India</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>State</span>
          <input name="state" placeholder="Lagos" />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>City</span>
          <input name="city" placeholder="Yaba" />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Date / time</span>
          <input name="datetime" type="datetime-local" />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: "1 / -1" }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>RSVP link</span>
          <input name="link" placeholder="https://…" />
        </label>
        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}>
          <button type="submit" disabled={submitting}>{submitting ? "Publishing…" : "Publish event"}</button>
          {success && <span style={{ color: "#5ad9a3", fontSize: 13 }}>{success}</span>}
          {error && <span style={{ color: "#ff8888", fontSize: 13 }}>{error}</span>}
        </div>
      </form>

      <div className="table">
        <div className="row head" style={{ gridTemplateColumns: "minmax(220px, 2fr) 1fr 1fr 1fr 1fr" }}>
          <span>Title</span><span>Type</span><span>Scope</span><span>When</span><span>Created</span>
        </div>
        {loading && (
          <div className="row" style={{ gridTemplateColumns: "1fr" }}>
            <span style={{ color: "var(--muted)" }}>Loading…</span>
          </div>
        )}
        {!loading && events.length === 0 && (
          <div className="row" style={{ gridTemplateColumns: "1fr" }}>
            <span style={{ color: "var(--muted)" }}>No events yet. Publish one above.</span>
          </div>
        )}
        {events.map((e) => {
          const scope = [e.scope_city, e.scope_state, e.scope_country].filter(Boolean).join(", ") || e.scope || "Worldwide";
          const dt = e.payload?.datetime ? new Date(e.payload.datetime).toLocaleString() : "—";
          return (
            <div className="row" key={e.id} style={{ gridTemplateColumns: "minmax(220px, 2fr) 1fr 1fr 1fr 1fr" }}>
              <span><strong>{e.title}</strong></span>
              <span>{e.payload?.type || "—"}</span>
              <span>{scope}</span>
              <span style={{ color: "var(--muted)", fontSize: 12 }}>{dt}</span>
              <span style={{ color: "var(--muted)", fontSize: 12 }}>
                {e.created_at ? new Date(e.created_at).toLocaleString() : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
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
      </div>
      {config.note && (
        <p style={{ margin: "0 1rem 1rem", color: "var(--muted)", fontSize: 12 }}>{config.note}</p>
      )}
      <div className="table">
        <div className="row head" style={{ gridTemplateColumns: `repeat(${config.columns.length}, minmax(140px, 1fr))` }}>
          {config.columns.map((column) => <span key={column}>{column}</span>)}
        </div>
        {config.rows.length === 0 && (
          <div className="row" style={{ gridTemplateColumns: "1fr" }}>
            <span style={{ color: "var(--muted)" }}>Nothing here yet — module not wired in this phase.</span>
          </div>
        )}
        {config.rows.map((row, idx) => (
          <div className="row" key={`${row.join("-")}-${idx}`} style={{ gridTemplateColumns: `repeat(${config.columns.length}, minmax(140px, 1fr))` }}>
            {row.map((cell, index) => (
              <span key={`${cell}-${index}`}>{cellContent(cell)}</span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function Settings({ getToken, flash }) {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiGet("/api/admin/feature-flags", getToken);
      setFlags(res?.data || []);
      setErr("");
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  }, [getToken]);

  useEffect(() => { reload(); }, [reload]);

  async function toggle(key, current) {
    try {
      await apiRequest("PATCH", `/api/admin/feature-flags/${encodeURIComponent(key)}`, getToken, { enabled: !current });
      flash(`Flag "${key}" set to ${!current}`);
      await reload();
    } catch (e) { flash(`Failed: ${e.message}`); }
  }

  return (
    <section className="panel" data-test="settings-panel">
      <div className="panel-title">
        <div>
          <h3>Settings and feature flags</h3>
          <p>Owner-controlled operational switches. Each toggle audits to the admin log via withAdminAudit.</p>
        </div>
        <button className="btn-secondary btn-sm" onClick={reload}>Reload</button>
      </div>
      {err && <p style={{ color: "var(--danger)", margin: "0 1rem 1rem", fontSize: 12 }}>{err}</p>}
      {loading && <p style={{ margin: "1rem", color: "var(--muted)" }}>Loading flags…</p>}
      {!loading && flags.length === 0 && (
        <p style={{ margin: "1rem", color: "var(--muted)" }}>No flags configured yet.</p>
      )}
      <div className="settings-list" data-test="feature-flags">
        {flags.map((row) => (
          <label key={row.key} data-test={`flag-${row.key}`}>
            <input
              type="checkbox"
              checked={Boolean(row.enabled)}
              onChange={() => toggle(row.key, Boolean(row.enabled))}
            />
            <span>
              <strong>{row.key}</strong>
              <small>
                {row.enabled ? "Enabled" : "Disabled"}
                {row.updated_at ? ` — last set ${new Date(row.updated_at).toLocaleString()}` : ""}
                {row.updated_by_email ? ` by ${row.updated_by_email}` : ""}
              </small>
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}

function ReviewsPage({ getToken, flash }) {
  const [tab, setTab] = useState("held");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiGet(`/api/admin/reviews?status=${encodeURIComponent(tab)}`, getToken);
      setRows(res?.data || []);
      setErr("");
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  }, [getToken, tab]);

  useEffect(() => { reload(); }, [reload]);

  async function actOnReview(reviewId, action) {
    const reason = action === "reject" ? window.prompt("Reason for rejection?") : null;
    if (action === "reject" && reason === null) return;
    try {
      await apiRequest("PATCH", `/api/admin/reviews/${reviewId}`, getToken, { action, reason });
      flash(`Review ${action}ed.`);
      await reload();
    } catch (e) { flash(`Failed: ${e.message}`); }
  }

  // PRD §9.4.5 — admin resolves a target-submitted report. `outcome` is
  // either 'kept' (the review stays live) or 'removed' (admin also rejects
  // the underlying review).
  async function resolveReport(reportRow, outcome) {
    if (!window.confirm(outcome === "removed"
      ? "Mark this report as resolved AND remove the underlying review?"
      : "Mark this report as resolved (keep the review live)?")) return;
    try {
      // Two-step: optionally reject the underlying review first, then resolve
      // the report row itself.
      const review = reportRow.review;
      if (outcome === "removed" && review?.id) {
        await apiRequest("PATCH", `/api/admin/reviews/${review.id}`, getToken, {
          action: "reject",
          reason: "Resolved via target report",
        });
      }
      await apiRequest("PATCH", `/api/admin/reviews/${reportRow.id}`, getToken, {
        action: "resolve-report",
        reportId: reportRow.id,
        outcome,
      });
      flash(`Report resolved (${outcome}).`);
      await reload();
    } catch (e) { flash(`Failed: ${e.message}`); }
  }

  return (
    <section className="panel" data-test="reviews-panel">
      <div className="panel-title">
        <div>
          <h3>Reviews moderation</h3>
          <p>1-2★ Trigger B reviews are held here until approval. Reported reviews surface in the Reports tab.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className={tab === "held" ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
            onClick={() => setTab("held")}
            data-test="reviews-tab-held"
          >Held (1–2★)</button>
          <button
            className={tab === "reports" ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
            onClick={() => setTab("reports")}
            data-test="reviews-tab-reports"
          >Reports</button>
          <button className="btn-secondary btn-sm" onClick={reload}>Reload</button>
        </div>
      </div>
      {err && <p style={{ color: "var(--danger)", margin: "0 1rem 1rem", fontSize: 12 }}>{err}</p>}
      <div className="table" data-test="reviews-table">
        {tab === "reports" ? (
          <div className="row head" style={{ gridTemplateColumns: "120px 1fr 1fr 240px" }}>
            <span>Rating</span><span>Reporter / reason</span><span>Underlying review</span><span>Actions</span>
          </div>
        ) : (
          <div className="row head" style={{ gridTemplateColumns: "120px 1fr 1fr 220px" }}>
            <span>Rating</span><span>Reviewer / target</span><span>Comment</span><span>Actions</span>
          </div>
        )}
        {loading && <div className="row" style={{ gridTemplateColumns: "1fr" }}><span style={{ color: "var(--muted)" }}>Loading…</span></div>}
        {!loading && rows.length === 0 && (
          <div className="row" style={{ gridTemplateColumns: "1fr" }}>
            <span style={{ color: "var(--muted)" }}>
              {tab === "reports" ? "No open target reports." : "Nothing in the held queue."}
            </span>
          </div>
        )}
        {tab === "reports"
          ? rows.map((report) => {
              const r = report.review || {};
              return (
                <div className="row" key={report.id} style={{ gridTemplateColumns: "120px 1fr 1fr 240px" }} data-test={`report-row-${report.id}`}>
                  <span><strong>{r.rating || "—"}★</strong></span>
                  <span style={{ fontSize: 12 }}>
                    Reporter: <code>{(report.reporter_id || "").slice(0, 14) || "—"}</code>
                    <br />
                    <span style={{ color: "var(--muted)" }}>Reason: {report.reason ? `"${report.reason.slice(0, 120)}"` : "(none given)"}</span>
                  </span>
                  <span style={{ fontSize: 12 }}>
                    {r.id ? <code style={{ color: "var(--muted)" }}>{r.id.slice(0, 8)}…</code> : "—"}
                    {r.comment && <><br /><span style={{ color: "var(--muted)" }}>{r.comment.slice(0, 140)}</span></>}
                  </span>
                  <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button className="btn-secondary btn-sm" onClick={() => resolveReport(report, "kept")} data-test={`report-keep-${report.id}`}>Keep review</button>
                    <button className="btn-primary btn-sm" onClick={() => resolveReport(report, "removed")} data-test={`report-remove-${report.id}`}>Remove review</button>
                  </span>
                </div>
              );
            })
          : rows.map((row) => {
              const r = row.review || row;
              return (
                <div className="row" key={r.id} style={{ gridTemplateColumns: "120px 1fr 1fr 220px" }} data-test={`review-row-${r.id}`}>
                  <span><strong>{r.rating}★</strong></span>
                  <span style={{ fontSize: 12 }}>
                    Reviewer: <code>{(r.reviewer_id || "").slice(0, 14) || "—"}</code><br />
                    Target: <code>{(r.target_user_id || "").slice(0, 14) || "—"}</code>
                  </span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{(r.comment || "").slice(0, 200) || "—"}</span>
                  <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button className="btn-primary btn-sm" onClick={() => actOnReview(r.id, "approve")} data-test={`approve-${r.id}`}>Approve</button>
                    <button className="btn-secondary btn-sm" onClick={() => actOnReview(r.id, "reject")} data-test={`reject-${r.id}`}>Reject</button>
                    <button className="btn-secondary btn-sm" onClick={() => actOnReview(r.id, "ban-reviewer")}>Ban reviewer</button>
                  </span>
                </div>
              );
            })}
      </div>
    </section>
  );
}

// PRD §14 — Help & Guide CMS editor.
function HelpCmsPage({ getToken, flash }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // null = list view, {} = new article, {...row} = edit
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "";
      const res = await apiGet(`/api/admin/help/articles${qs}`, getToken);
      setRows(res?.data ?? []);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken, statusFilter]);

  useEffect(() => { reload(); }, [reload]);

  async function publish(row) {
    try {
      await apiRequest("POST", `/api/admin/help/articles/${row.id}/publish`, getToken, {});
      flash(`Published "${row.title}".`);
      await reload();
    } catch (e) { flash(`Failed: ${e.message}`); }
  }

  async function archive(row) {
    if (!window.confirm(`Archive "${row.title}"?`)) return;
    try {
      await apiRequest("POST", `/api/admin/help/articles/${row.id}/archive`, getToken, {});
      flash(`Archived "${row.title}".`);
      await reload();
    } catch (e) { flash(`Failed: ${e.message}`); }
  }

  if (editing) {
    return <HelpCmsEditor
      initial={editing}
      onCancel={() => setEditing(null)}
      busy={busy}
      onSubmit={async (input, action) => {
        setBusy(true);
        try {
          if (editing.id) {
            await apiRequest("PATCH", `/api/admin/help/articles/${editing.id}`, getToken, input);
            if (action === "publish") {
              await apiRequest("POST", `/api/admin/help/articles/${editing.id}/publish`, getToken, {});
            }
          } else {
            const r = await apiRequest("POST", "/api/admin/help/articles", getToken, input);
            if (action === "publish" && r?.data?.id) {
              await apiRequest("POST", `/api/admin/help/articles/${r.data.id}/publish`, getToken, {});
            }
          }
          flash(`Saved.`);
          setEditing(null);
          await reload();
        } catch (e) {
          flash(`Save failed: ${e.message}`);
        } finally {
          setBusy(false);
        }
      }}
    />;
  }

  return (
    <section className="panel" data-test="help-cms-panel">
      <div className="panel-title">
        <div>
          <h3>Help &amp; Guide CMS</h3>
          <p>Author markdown articles, publish to the public knowledge base. PRD §14.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <button className="btn-secondary btn-sm" onClick={reload}>Reload</button>
          <button className="btn-primary btn-sm" onClick={() => setEditing({})} data-test="help-cms-new">+ New article</button>
        </div>
      </div>
      {error && <p style={{ color: "var(--danger)", margin: "0 1rem 1rem", fontSize: 12 }}>{error}</p>}
      <div className="table">
        <div className="row head" style={{ gridTemplateColumns: "1fr 140px 120px 160px 200px" }}>
          <span>Title</span><span>Category</span><span>Status</span><span>Published</span><span>Actions</span>
        </div>
        {loading && <div className="row" style={{ gridTemplateColumns: "1fr" }}><span style={{ color: "var(--muted)" }}>Loading…</span></div>}
        {!loading && rows.length === 0 && <div className="row" style={{ gridTemplateColumns: "1fr" }}><span style={{ color: "var(--muted)" }}>No articles yet.</span></div>}
        {rows.map((row) => (
          <div className="row" key={row.id} style={{ gridTemplateColumns: "1fr 140px 120px 160px 200px" }} data-test={`help-cms-row-${row.id}`}>
            <span>
              <strong style={{ fontSize: 13 }}>{row.title}</strong>
              <br /><code style={{ fontSize: 11, color: "var(--muted)" }}>{row.slug}</code>
            </span>
            <span style={{ fontSize: 12 }}>{row.category || "—"}</span>
            <span>{cellContent(row.status)}</span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {row.published_at ? new Date(row.published_at).toLocaleDateString() : "—"}
            </span>
            <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button className="btn-secondary btn-sm" onClick={() => setEditing(row)}>Edit</button>
              {row.status !== "published" && (
                <button className="btn-primary btn-sm" onClick={() => publish(row)} data-test={`help-cms-publish-${row.id}`}>Publish</button>
              )}
              {row.status !== "archived" && (
                <button className="btn-secondary btn-sm" onClick={() => archive(row)}>Archive</button>
              )}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function HelpCmsEditor({ initial, onSubmit, onCancel, busy }) {
  const [title, setTitle] = useState(initial.title || "");
  const [slug, setSlug] = useState(initial.slug || "");
  const [body, setBody] = useState(initial.body || "");
  const [category, setCategory] = useState(initial.category || "");
  const [tagsInput, setTagsInput] = useState(Array.isArray(initial.tags) ? initial.tags.join(", ") : "");

  const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);

  function build() {
    return {
      title: title.trim(),
      body,
      slug: slug.trim() || undefined,
      category: category.trim() || null,
      tags,
    };
  }

  return (
    <section className="panel" data-test="help-cms-editor">
      <div className="panel-title">
        <div>
          <h3>{initial.id ? "Edit article" : "New article"}</h3>
          <p>Markdown body. Slug auto-derives from title if left blank.</p>
        </div>
        <button className="btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
      </div>
      <div className="form-grid" style={{ padding: "0 1rem 1rem" }}>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} data-test="help-cms-title" />
        </label>
        <label>
          Slug (optional — auto-derives from title)
          <input value={slug} onChange={(e) => setSlug(e.target.value)} data-test="help-cms-slug" />
        </label>
        <label>
          Category
          <input value={category} onChange={(e) => setCategory(e.target.value)} data-test="help-cms-category" placeholder="getting-started, billing, etc." />
        </label>
        <label>
          Tags (comma-separated)
          <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} data-test="help-cms-tags" />
        </label>
        <label>
          Body (markdown)
          <textarea rows={18} value={body} onChange={(e) => setBody(e.target.value)} data-test="help-cms-body" style={{ fontFamily: "var(--mono, ui-monospace)" }} />
        </label>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className="btn-secondary" disabled={busy} onClick={() => onSubmit(build(), "save")} data-test="help-cms-save-draft">
            Save as draft
          </button>
          <button className="btn-primary" disabled={busy} onClick={() => onSubmit(build(), "publish")} data-test="help-cms-publish">
            Save & publish
          </button>
        </div>
      </div>
    </section>
  );
}

function AdminFooter() {
  return (
    <footer className="admin-footer">
      <div>
        <strong>Needool Admin</strong>
        <span className="mono">v3.0 · MVP operations environment</span>
      </div>
      <nav>
        <a href="#/settings">Settings</a>
        <a href="#/audit-log">Audit log</a>
        <a href={PUBLIC_SITE_URL} target="_blank" rel="noreferrer">Public site ↗</a>
        <a href={`${API_BASE}/health`} target="_blank" rel="noreferrer">API health ↗</a>
      </nav>
    </footer>
  );
}

function Root() {
  if (!CLERK_PUBLISHABLE_KEY) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <p className="eyebrow">Configuration missing</p>
          <h1>Set VITE_CLERK_PUBLISHABLE_KEY</h1>
          <p>
            Add your Clerk publishable key to <code>admin-panel/.env.local</code> and restart
            <code> npm run dev:admin</code>.
          </p>
        </section>
      </main>
    );
  }
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <AdminAuthGate />
    </ClerkProvider>
  );
}

createRoot(document.getElementById("root")).render(<Root />);
