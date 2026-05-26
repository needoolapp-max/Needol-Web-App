import { Link, useRouterState } from "@tanstack/react-router";
import { BriefcaseBusiness, CalendarDays, CircleDollarSign, ClipboardList, Menu, Sparkles, Trophy, X } from "lucide-react";
import { useState } from "react";
import { SearchBar } from "@/components/search/SearchBar";
import { ThemeToggle } from "@/components/nav/ThemeToggle";

const navLinks = [
  { to: "/needs", label: "Needs", icon: ClipboardList },
  { to: "/opportunities", label: "Opportunities", icon: Trophy },
  { to: "/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/pricing", label: "Pricing", icon: CircleDollarSign },
] as const;

export function TopNav() {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (r) => r.location.pathname });

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-sidebar/95 shadow-[0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <img src="/brand-logo.webp" alt="Needool" width="149" height="120" className="h-10 w-auto sm:h-12" />
        </Link>

        {/* Desktop search */}
        <div className="flex-1 max-w-2xl hidden md:block">
          <SearchBar variant="compact" />
        </div>

        {/* Desktop nav */}
        <nav className="ml-auto hidden lg:flex items-center gap-0.5 text-sm font-medium">
          {navLinks.map(({ to, label, icon: Icon }) => {
            const active = path === to;
            return (
              <Link
                key={to}
                to={to}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 transition ${
                  active
                    ? "nav-link-active"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}

          <div className="ml-2 flex items-center gap-2">
            <Link
              to="/login"
              className="inline-flex min-h-10 items-center rounded-lg border border-border bg-secondary/60 px-3.5 py-2 text-sidebar-foreground transition hover:bg-muted"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground shadow-md shadow-primary/25 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30"
            >
              <Sparkles className="h-4 w-4" /> Sign Up
            </Link>
          </div>
        </nav>

        <div className="lg:ml-2">
          <ThemeToggle />
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="min-h-11 min-w-11 rounded-lg p-2 hover:bg-muted lg:hidden"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-t border-border bg-sidebar px-4 py-3 space-y-1 text-sm font-medium animate-fade-in">
          <div className="pb-2">
            <SearchBar variant="compact" />
          </div>
          {navLinks.map(({ to, label, icon: Icon }) => {
            const active = path === to;
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 min-h-11 rounded-lg px-3 py-2.5 transition ${
                  active
                    ? "bg-primary/10 text-primary font-semibold"
                    : "hover:bg-sidebar-accent"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
          <div className="pt-2 grid gap-2">
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center min-h-11 rounded-lg border border-border bg-secondary/60 px-3 py-2.5 text-center font-medium"
            >
              Login
            </Link>
            <Link
              to="/signup"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 min-h-11 rounded-lg bg-primary px-3 py-2.5 font-bold text-primary-foreground shadow-md"
            >
              <Sparkles className="h-4 w-4" /> Sign Up Free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
