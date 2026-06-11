import { Link } from "@tanstack/react-router";
import { BadgeCheck, BellRing, MapPin, MessageCircle } from "lucide-react";
import { LedgerCard } from "@/components/ui/ledger-card";
import type { Provider } from "@/lib/mockData";

/**
 * Phase 10-2 — ProviderCard, Editorial Trust Ledger pass.
 *  - LedgerCard surface (no spotlight, no surface-elevated shadow stack).
 *  - Meta is mono: distance, rate, skill chips.
 *  - The hardcoded fake "4.0 · 12 reviews" row was a credibility bug on a
 *    trust product and is removed. Real ratings come from a future API
 *    field; the card is honest until then.
 *  - skill-tag-* rotating colored pill variants replaced with a single
 *    mono cluster — dots separating tokens, no hue rotation.
 */
export function ProviderCard({ p }: { p: Provider }) {
  const inactive = p.status === "inactive";

  return (
    <LedgerCard
      className={`group flex flex-col p-4 ${inactive ? "opacity-80" : ""}`}
    >
      {/* Avatar + header */}
      <div className="flex items-start gap-3">
        <Link
          to="/p/$username"
          params={{ username: p.username }}
          className="relative shrink-0"
        >
          <img
            src={p.avatar}
            alt={p.name}
            loading="lazy"
            width={56}
            height={56}
            className={`h-14 w-14 rounded-lg object-cover ${
              inactive
                ? "ring-1 ring-border"
                : "ring-1 ring-border group-hover:ring-foreground"
            }`}
          />
          {!inactive && (
            <span
              className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-card bg-success"
              aria-label="Active"
            />
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link
              to="/p/$username"
              params={{ username: p.username }}
              className="block min-w-0"
            >
              <h3 className="flex items-center gap-1 truncate text-[15px] font-bold leading-snug text-foreground">
                {p.name}
                {p.verified && (
                  <BadgeCheck
                    className="h-4 w-4 shrink-0 text-primary"
                    aria-label="Verified provider"
                  />
                )}
              </h3>
              <p className="truncate font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                @{p.username}
              </p>
            </Link>

            <span
              className={`shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] ${
                inactive ? "text-muted-foreground" : "text-success"
              }`}
            >
              {inactive ? "Inactive" : "Active"}
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            <span className="text-foreground/80">{p.accountType}</span>
            <span aria-hidden className="h-3 w-px bg-border" />
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {p.city}, {p.country}
            </span>
            <span aria-hidden className="h-3 w-px bg-border" />
            <span>
              {p.distanceKm < 100
                ? `${p.distanceKm.toFixed(1)} km`
                : `${Math.round(p.distanceKm)} km`}
            </span>
          </div>
        </div>
      </div>

      {/* Skills — mono cluster, no rotating pill variants. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] uppercase tracking-[0.14em] text-foreground/80">
        {p.skills.slice(0, 4).map((s, i) => (
          <span key={s} className="inline-flex items-center gap-2">
            {i > 0 && (
              <span aria-hidden className="text-muted-foreground/60">
                &middot;
              </span>
            )}
            {s}
          </span>
        ))}
        {p.skills.length > 4 && (
          <span className="text-muted-foreground">
            +{p.skills.length - 4}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        <span className="font-mono text-xs font-semibold text-foreground">
          {p.hourlyRate ? `${p.currency} ${p.hourlyRate}/HR` : "NON-PROFIT"}
        </span>
        {inactive ? (
          <button className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition-colors hover:border-foreground">
            <BellRing className="h-3.5 w-3.5" /> Notify me
          </button>
        ) : (
          <Link
            to="/p/$username"
            params={{ username: p.username }}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-1.5 text-xs font-bold text-background transition-opacity hover:opacity-90"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Contact
          </Link>
        )}
      </div>
    </LedgerCard>
  );
}
