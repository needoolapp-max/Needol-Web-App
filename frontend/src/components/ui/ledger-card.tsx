import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Phase 10-2 — LedgerCard. The Editorial Trust Ledger replacement for
 * GlowCard / `.spotlight-card`. Flat surface with a hairline border,
 * ink-on-hover (border darkens to var(--foreground)) and a 2px lift.
 * Zero ambient gradient, zero mouse-tracking spotlight, zero
 * background-attachment: fixed raster cost.
 *
 * Variants:
 *   - "box" (default) — boxed card with rounded-xl, padding, suitable
 *     for grid layouts (providers, posts, plans).
 *   - "row" — borderless, no radius, no padding. Use inside <ul
 *     className="divide-y divide-border border-y border-border"> for
 *     ruled feed lists. Hover background tint instead of border.
 */
type LedgerCardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "box" | "row";
  interactive?: boolean;
};

export const LedgerCard = React.forwardRef<HTMLDivElement, LedgerCardProps>(
  ({ className, variant = "box", interactive = true, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-card text-card-foreground",
          variant === "box" &&
            "rounded-xl border border-border transition-colors duration-200",
          variant === "box" &&
            interactive &&
            "hover:-translate-y-0.5 hover:border-foreground motion-reduce:transform-none",
          variant === "row" &&
            "transition-colors duration-200",
          variant === "row" &&
            interactive &&
            "hover:bg-secondary/40",
          className,
        )}
        {...rest}
      />
    );
  },
);
LedgerCard.displayName = "LedgerCard";
