import React, { type ReactNode } from "react";
import { LedgerCard } from "@/components/ui/ledger-card";
import { cn } from "@/lib/utils";

/**
 * Phase 10-2 — GlowCard is now a compatibility shim over LedgerCard.
 *
 * The original spotlight-card.tsx ran a per-frame mousemove listener,
 * mutated CSS vars on every move, and used `background-attachment: fixed`
 * inside a rounded clip — three significant raster costs and the
 * single most "AI-component" visual signal sitewide. Both go away here.
 *
 * Existing consumers (PostFeedPage, ProviderCard, ReviewCard, jobs,
 * dashboards, MvpSectionPage…) keep their import + props untouched.
 * All previously-decorative props (`glowColor`, `size`, `width`,
 * `height`, `customSize`) are now silently no-ops.
 */
interface GlowCardProps {
  children?: ReactNode;
  className?: string;
  /** No-op; kept for backwards compatibility with prior call sites. */
  glowColor?: "blue" | "purple" | "green" | "red" | "orange";
  /** No-op; kept for backwards compatibility with prior call sites. */
  size?: "sm" | "md" | "lg";
  /** No-op; kept for backwards compatibility with prior call sites. */
  width?: string | number;
  /** No-op; kept for backwards compatibility with prior call sites. */
  height?: string | number;
  /** No-op; kept for backwards compatibility with prior call sites. */
  customSize?: boolean;
}

export const GlowCard: React.FC<GlowCardProps> = ({
  children,
  className = "",
}) => {
  return <LedgerCard className={cn(className)}>{children}</LedgerCard>;
};

export default GlowCard;
