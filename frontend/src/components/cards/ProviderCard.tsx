import { Link } from "@tanstack/react-router";
import { MapPin, BadgeCheck, MessageCircle, BellRing } from "lucide-react";
import type { Provider } from "@/lib/mockData";

const typeColor: Record<string, string> = {
  Individual: "bg-secondary text-secondary-foreground",
  Business: "bg-primary/10 text-primary",
  NGO: "bg-accent/15 text-accent-foreground",
};

export function ProviderCard({ p }: { p: Provider }) {
  const inactive = p.status === "inactive";
  return (
    <article className={`group rounded-lg border border-border bg-card p-4 shadow-[0_12px_24px_rgba(0,0,0,0.12)] transition hover:-translate-y-0.5 hover:border-primary/50 ${inactive ? "opacity-90" : ""}`}>
      <div className="flex items-start gap-3">
        <Link to="/p/$username" params={{ username: p.username }} className="shrink-0">
          <img src={p.avatar} alt={p.name} className="h-14 w-14 rounded-md object-cover" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link to="/p/$username" params={{ username: p.username }} className="block">
                <h3 className="flex items-center gap-1 text-[15px] font-semibold text-foreground truncate">
                  {p.name}
                  {p.verified && <BadgeCheck className="h-4 w-4 text-primary shrink-0" />}
                </h3>
                <p className="text-xs text-muted-foreground truncate">@{p.username}</p>
              </Link>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                inactive ? "bg-muted text-muted-foreground" : "bg-success/15 text-success"
              }`}
            >
              {inactive ? "Inactive" : "Active"}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
            <span className={`rounded-md px-2 py-0.5 font-medium ${typeColor[p.accountType]}`}>{p.accountType}</span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3 w-3" /> {p.city}, {p.country} · {p.distanceKm < 100 ? `${p.distanceKm.toFixed(1)} km` : `${Math.round(p.distanceKm)} km`}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {p.skills.slice(0, 4).map((s) => (
          <span key={s} className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-foreground/80">{s}</span>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{p.hourlyRate ? `${p.currency} ${p.hourlyRate}/hr` : "Non-profit"}</span>
        {inactive ? (
          <button className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
            <BellRing className="h-3.5 w-3.5" /> Notify when active
          </button>
        ) : (
          <Link
            to="/p/$username"
            params={{ username: p.username }}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Contact
          </Link>
        )}
      </div>
    </article>
  );
}
