import type { ReactNode } from "react";
import { SearchX } from "lucide-react";

/**
 * Phase 10-2 — Editorial Trust Ledger empty state. Flat dashed border (no
 * rounded corners, no card chrome), a small bare Lucide icon, a mono
 * uppercase kicker, a body description, and an optional action slot.
 * Replaces the rounded-2xl card + rounded-2xl bg-muted icon well pattern.
 * Used by /search (no providers match), Notifications, and Saved across
 * the dashboard.
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="border border-dashed border-border p-8 text-center">
      <div className="mx-auto inline-flex h-6 w-6 items-center justify-center text-muted-foreground">
        {icon ?? <SearchX className="h-5 w-5" />}
      </div>
      <p className="mt-4 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground">
        {title}
      </p>
      {description && (
        <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
