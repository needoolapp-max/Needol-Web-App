import { Star } from "lucide-react";
import type { Review } from "@/lib/mockData";

/**
 * Phase 10-2 — ReviewCard, Editorial Trust Ledger pass. A review is a
 * ruled ledger entry, not a card. Place inside a divide-y border-y
 * container to inherit the ruled-list aesthetic.
 */
export function ReviewCard({ r }: { r: Review }) {
  return (
    <article className="flex flex-col gap-3 py-5">
      <header className="flex items-center gap-3">
        <img
          src={r.reviewerAvatar}
          alt=""
          loading="lazy"
          width={40}
          height={40}
          className="h-10 w-10 rounded-lg object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {r.reviewer}
            </span>
            <span
              className={`font-mono text-[10px] font-semibold uppercase tracking-[0.18em] ${
                r.tag === "Verified Hire"
                  ? "text-success"
                  : "text-muted-foreground"
              }`}
            >
              {r.tag}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            <span className="flex" aria-label={`${r.rating} of 5 stars`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${
                    i < r.rating ? "fill-accent text-accent" : "text-border"
                  }`}
                />
              ))}
            </span>
            <span aria-hidden className="h-3 w-px bg-border" />
            <span>{r.date}</span>
          </div>
        </div>
      </header>
      <p className="text-sm leading-relaxed text-foreground/90">{r.body}</p>
    </article>
  );
}
