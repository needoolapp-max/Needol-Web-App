import { Link, useRouterState } from "@tanstack/react-router";
import {
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  Menu,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { useState } from "react";
import { SearchBar } from "@/components/search/SearchBar";
import { ThemeToggle } from "@/components/nav/ThemeToggle";

const navLinks = [
  { to: "/needs",        label: "Needs",         icon: ClipboardList },
  { to: "/opportunities",label: "Opportunities",  icon: Trophy },
  { to: "/jobs",         label: "Jobs",           icon: BriefcaseBusiness },
  { to: "/events",       label: "Events",         icon: CalendarDays },
  { to: "/pricing",      label: "Pricing",        icon: CircleDollarSign },
] as const;

export function TopNav() {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (r) => r.location.pathname });

  return (
    <header className="topnav-header sticky top-0 z-40">
      {/* ── Desktop & tablet bar ── */}
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6 lg:gap-4">

        {/* Logo */}
        <Link
          to="/"
          className="topnav-logo shrink-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <img
            src="/brand-logo.webp"
            alt="Needool"
            width="149"
            height="120"
            className="h-9 w-auto sm:h-10"
          />
        </Link>

        {/* Search — hidden on mobile until menu opens */}
        <div className="hidden md:block flex-1 max-w-xl mx-2">
          <SearchBar variant="compact" />
        </div>

        {/* Flex push on mobile */}
        <div className="flex-1 md:hidden" />

        {/* Desktop nav links (text-only, no icons) */}
        <nav className="hidden lg:flex items-center" aria-label="Main navigation">
          {navLinks.map(({ to, label }) => {
            const active = path === to;
            return (
              <Link
                key={to}
                to={to}
                className={`topnav-link px-3.5 py-2.5 text-[13px] font-semibold tracking-[0.01em] transition-colors ${
                  active
                    ? "text-primary topnav-link--active"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop auth */}
        <div className="hidden lg:flex items-center gap-1 ml-1">
          <Link
            to="/login"
            className="px-4 py-2 text-[13px] font-semibold text-muted-foreground rounded-lg transition-colors hover:text-foreground hover:bg-sidebar-accent"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="topnav-cta inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold text-primary-foreground bg-primary"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Get started
          </Link>
        </div>

        <ThemeToggle />

        {/* Hamburger */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="topnav-hamburger lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      {open && (
        <nav
          className="topnav-mobile-drawer lg:hidden"
          aria-label="Mobile navigation"
        >
          <div className="mx-auto max-w-7xl px-4 pb-4 sm:px-6">
            {/* Search */}
            <div className="pb-3 pt-1">
              <SearchBar variant="compact" />
            </div>

            {/* Nav links */}
            <div className="space-y-0.5">
              {navLinks.map(({ to, label, icon: Icon }) => {
                const active = path === to;
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 min-h-11 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-75" />
                    {label}
                  </Link>
                );
              })}
            </div>

            {/* Auth */}
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center min-h-11 rounded-xl border border-border bg-secondary/60 text-sm font-semibold hover:bg-secondary transition-colors"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                onClick={() => setOpen(false)}
                className="topnav-cta flex items-center justify-center gap-2 min-h-11 rounded-xl bg-primary text-sm font-bold text-primary-foreground"
              >
                <Sparkles className="h-4 w-4" />
                Get started
              </Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
