import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Phase 10-2 — Editorial Trust Ledger section header. Used on every redesigned
 * surface: numbered section markers (01, 02, …), mono kicker, Urbanist
 * display title, optional sub, optional right-aligned CTA. Anatomy:
 *
 *   ────────────────────────────────  (border-t-2 border-foreground)
 *   01   FEATURED          View all →
 *   Top providers, ranked by activity.
 *   Verified, recently active, …
 *
 * No card chrome, no gradients, no pill backgrounds. The mono kicker is the
 * first encounter most users have with the meta layer.
 */
export type EditorialHeaderProps = {
  number: string;
  kicker: string;
  title: string;
  sub?: string;
  cta?: { to: string; label: string };
  /** Optional extra slot on the right of the kicker row (mono meta count, etc). */
  meta?: React.ReactNode;
  className?: string;
};

export function EditorialHeader({
  number,
  kicker,
  title,
  sub,
  cta,
  meta,
  className,
}: EditorialHeaderProps) {
  return (
    <header className={cn("border-t-2 border-foreground pt-6", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-4">
          <span
            aria-hidden
            className="font-mono text-sm font-semibold tracking-[0.16em] text-foreground"
          >
            {number}
          </span>
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {kicker}
          </span>
          {meta && (
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground/80">
              {meta}
            </span>
          )}
        </div>
        {cta && (
          <Link
            to={cta.to}
            className="hidden items-center gap-1 text-xs font-semibold text-foreground/70 underline-offset-4 hover:text-primary hover:underline sm:inline-flex"
          >
            {cta.label}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <h2 className="mt-4 max-w-3xl font-heading text-2xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      {sub && (
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{sub}</p>
      )}
    </header>
  );
}
