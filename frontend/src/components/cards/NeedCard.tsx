import type { NeedRequest } from "@/lib/mockData";
import { GlowCard } from "@/components/ui/spotlight-card";
import { Clock, MapPin } from "lucide-react";

export function NeedCard({ n }: { n: NeedRequest }) {
  return (
    <GlowCard
      customSize
      className="min-w-[min(280px,calc(100vw-2rem))] sm:min-w-0 rounded-2xl p-4 shadow-[0_8px_20px_rgba(0,0,0,0.10)] transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_16px_32px_rgba(0,0,0,0.14)]"
    >
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {n.postedAgo}</span>
        <span aria-hidden="true">/</span>
        <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {n.location}</span>
      </div>
      <h4 className="mt-2 text-sm font-semibold text-foreground line-clamp-2">{n.title}</h4>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {n.tags.map((t) => (
          <span key={t} className="rounded-md bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent-foreground">{t}</span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <span className="text-xs text-muted-foreground">by {n.poster}</span>
        <span className="text-sm font-semibold text-primary">{n.budget}</span>
      </div>
    </GlowCard>
  );
}
