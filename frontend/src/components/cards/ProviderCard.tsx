import { Link } from "@tanstack/react-router";
import { MapPin, BadgeCheck, MessageCircle, BellRing, Star } from "lucide-react";
import { GlowCard } from "@/components/ui/spotlight-card";
import type { Provider } from "@/lib/mockData";

const typeConfig: Record<string, { cls: string }> = {
  Individual: { cls: "bg-secondary text-secondary-foreground" },
  Business:   { cls: "skill-tag skill-tag-primary" },
  NGO:        { cls: "skill-tag skill-tag-accent" },
};

const tagVariants = ["skill-tag-default", "skill-tag-primary", "skill-tag-accent"] as const;

export function ProviderCard({ p }: { p: Provider }) {
  const inactive = p.status === "inactive";
  const { cls: typeClass } = typeConfig[p.accountType] ?? typeConfig.Individual;

  return (
    <GlowCard
      customSize
      className={`group surface-elevated flex flex-col rounded-xl p-4 transition hover:-translate-y-1.5 hover:border-primary/50 ${inactive ? "opacity-80" : ""}`}
    >
      {/* Avatar + header */}
      <div className="flex items-start gap-3">
        <Link to="/p/$username" params={{ username: p.username }} className="shrink-0 relative">
          <img
            src={p.avatar}
            alt={p.name}
            loading="lazy"
            className={`h-14 w-14 rounded-xl object-cover transition ${
              inactive
                ? "ring-2 ring-border"
                : "ring-2 ring-primary/20 group-hover:ring-primary/50 group-hover:shadow-[0_0_14px_rgba(2,119,180,0.25)]"
            }`}
          />
          {!inactive && (
            <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-card bg-success" aria-label="Active" />
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link to="/p/$username" params={{ username: p.username }} className="min-w-0 block">
              <h3 className="flex items-center gap-1 truncate text-[15px] font-bold text-foreground leading-snug">
                {p.name}
                {p.verified && (
                  <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-label="Verified provider" />
                )}
              </h3>
              <p className="truncate text-xs text-muted-foreground">@{p.username}</p>
            </Link>

            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                inactive ? "bg-muted text-muted-foreground" : "bg-success/12 text-success"
              }`}
            >
              {inactive ? "Inactive" : "Active"}
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
            <span className={`rounded-md px-2 py-0.5 font-semibold text-[11px] ${typeClass}`}>{p.accountType}</span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {p.city}, {p.country}
              <span className="text-muted-foreground/60">
                · {p.distanceKm < 100 ? `${p.distanceKm.toFixed(1)} km` : `${Math.round(p.distanceKm)} km`}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Rating row */}
      {!inactive && (
        <div className="mt-3 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className={`h-3.5 w-3.5 ${i <= 4 ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"}`} />
          ))}
          <span className="ml-1 text-[11px] font-semibold text-muted-foreground">4.0 · 12 reviews</span>
        </div>
      )}

      {/* Skills */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {p.skills.slice(0, 4).map((s, i) => (
          <span key={s} className={`skill-tag ${tagVariants[i % tagVariants.length]}`}>{s}</span>
        ))}
        {p.skills.length > 4 && (
          <span className="skill-tag skill-tag-default text-muted-foreground">+{p.skills.length - 4}</span>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto pt-4 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">
          {p.hourlyRate ? `${p.currency} ${p.hourlyRate}/hr` : "Non-profit"}
        </span>
        {inactive ? (
          <button className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-muted hover:border-primary/40">
            <BellRing className="h-3.5 w-3.5" /> Notify me
          </button>
        ) : (
          <Link
            to="/p/$username"
            params={{ username: p.username }}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Contact
          </Link>
        )}
      </div>
    </GlowCard>
  );
}
