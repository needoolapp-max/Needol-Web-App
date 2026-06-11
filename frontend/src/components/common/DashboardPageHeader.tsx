import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Phase 10-2 — Shared dashboard sub-page header. Mono breadcrumb,
 * Urbanist display title, optional sub, optional right-aligned action
 * slot. Under a 2px top-foreground rule. Used inside DashboardLayout
 * children to give every dashboard surface the same editorial entry.
 */
type Crumb = { label: string; to?: string };

export type DashboardPageHeaderProps = {
  title: string;
  /** Each crumb is rendered as a mono uppercase segment; omit `to` for the current/leaf segment. */
  breadcrumbs?: Crumb[];
  sub?: string;
  action?: React.ReactNode;
  className?: string;
};

export function DashboardPageHeader({
  title,
  breadcrumbs,
  sub,
  action,
  className,
}: DashboardPageHeaderProps) {
  return (
    <header className={cn("border-t-2 border-foreground pt-6", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="mb-3 flex flex-wrap items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground"
        >
          {breadcrumbs.map((c, i) => (
            <span key={`${c.label}-${i}`} className="inline-flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3 w-3 opacity-60" />}
              {c.to ? (
                <Link
                  to={c.to}
                  className="underline-offset-4 hover:text-foreground hover:underline"
                >
                  {c.label}
                </Link>
              ) : (
                <span className="text-foreground">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {sub && (
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{sub}</p>
      )}
    </header>
  );
}
