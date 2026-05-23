import type { NeedRequest } from "@/lib/mockData";
import { Clock, MapPin } from "lucide-react";

export function NeedCard({ n }: { n: NeedRequest }) {
  return (
    <article className="min-w-[min(280px,calc(100vw-2rem))] sm:min-w-0 rounded-lg border border-border bg-card p-4 shadow-[0_12px_24px_rgba(0,0,0,0.12)] transition hover:-translate-y-0.5 hover:border-primary/50">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {n.postedAgo}</span>
        <span>·</span>
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
    </article>
  );
}
