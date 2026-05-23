import { Link } from "@tanstack/react-router";
import { BriefcaseBusiness, CalendarDays, CircleDollarSign, ClipboardList, Menu, Sparkles, Trophy, X } from "lucide-react";
import { useState } from "react";
import { SearchBar } from "@/components/search/SearchBar";
import { ThemeToggle } from "@/components/nav/ThemeToggle";

export function TopNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-sidebar/95 shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src="/brand-logo.png" alt="Needool" className="h-10 w-auto sm:h-12" />
        </Link>
        <div className="flex-1 max-w-2xl hidden md:block">
          <SearchBar variant="compact" />
        </div>
        <nav className="ml-auto hidden lg:flex items-center gap-1 text-sm font-medium">
          <Link to="/needs" className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"><ClipboardList className="h-4 w-4" />Needs</Link>
          <Link to="/opportunities" className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"><Trophy className="h-4 w-4" />Opportunities</Link>
          <Link to="/jobs" className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"><BriefcaseBusiness className="h-4 w-4" />Jobs</Link>
          <Link to="/events" className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"><CalendarDays className="h-4 w-4" />Events</Link>
          <Link to="/pricing" className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"><CircleDollarSign className="h-4 w-4" />Pricing</Link>
          <Link to="/login" className="ml-2 rounded-md border border-border bg-secondary px-3.5 py-2 text-sidebar-foreground hover:bg-muted">Login</Link>
          <Link to="/signup" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 font-semibold text-primary-foreground hover:bg-primary/90"><Sparkles className="h-4 w-4" />Sign Up</Link>
        </nav>
        <div className="ml-auto lg:ml-2">
          <ThemeToggle />
        </div>
        <button onClick={() => setOpen((v) => !v)} className="lg:hidden rounded-lg p-2 hover:bg-muted">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      <div className="md:hidden px-4 pb-3">
        <SearchBar variant="compact" />
      </div>
      {open && (
        <div className="lg:hidden border-t border-border bg-sidebar px-4 py-3 space-y-1 text-sm font-medium">
          <Link to="/needs" className="block rounded-md px-3 py-2 hover:bg-sidebar-accent">Needs</Link>
          <Link to="/opportunities" className="block rounded-md px-3 py-2 hover:bg-sidebar-accent">Opportunities</Link>
          <Link to="/jobs" className="block rounded-md px-3 py-2 hover:bg-sidebar-accent">Jobs</Link>
          <Link to="/events" className="block rounded-md px-3 py-2 hover:bg-sidebar-accent">Events</Link>
          <Link to="/pricing" className="block rounded-md px-3 py-2 hover:bg-sidebar-accent">Pricing</Link>
          <Link to="/login" className="block rounded-md px-3 py-2 hover:bg-sidebar-accent">Login</Link>
          <Link to="/signup" className="block rounded-md bg-primary px-3 py-2 font-semibold text-primary-foreground">Sign Up</Link>
        </div>
      )}
    </header>
  );
}
