import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

/**
 * Phase 10-2 — Editorial Trust Ledger AuthShell. Split editorial pane:
 *   • Left 40% (desktop) is a brand panel: flat var(--sidebar)
 *     background, the "NEEDOOL" wordmark as a typographic object, a
 *     mono trust line under a hairline rule, and the title/subtitle in
 *     editorial form. Below `lg`, the brand panel stacks above and
 *     becomes a compact bar so mobile users still get auth-first.
 *   • Right 60% holds the Clerk widget passed as children, on a flat
 *     background with a hairline border.
 */
type AuthShellProps = {
  children: ReactNode;
  title: string;
  subtitle: string;
};

export function AuthShell({ children, title, subtitle }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Brand panel */}
        <aside className="relative flex flex-col justify-between border-b border-border bg-sidebar px-6 py-10 text-sidebar-foreground sm:px-10 lg:border-b-0 lg:border-r lg:border-sidebar-border lg:px-14 lg:py-16">
          <Link
            to="/"
            aria-label="Needool home"
            className="inline-flex items-baseline gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
          >
            <span className="font-heading text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
              NEEDOOL
            </span>
          </Link>

          <div className="mt-10 max-w-md lg:mt-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-sidebar-foreground/55">
              Verified providers &middot; 12 countries
            </p>
            <h1 className="mt-4 font-heading text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-sidebar-foreground/75 sm:text-base">
              {subtitle}
            </p>
          </div>

          <p className="mt-10 hidden font-mono text-[11px] uppercase tracking-[0.18em] text-sidebar-foreground/55 lg:block">
            &copy; 2026 Needool &middot; Lagos &rarr; Worldwide
          </p>
        </aside>

        {/* Form pane */}
        <section className="flex flex-col items-center justify-center px-6 py-10 sm:px-10 lg:px-14 lg:py-16">
          <div className="w-full max-w-md">{children}</div>
        </section>
      </div>
    </main>
  );
}
