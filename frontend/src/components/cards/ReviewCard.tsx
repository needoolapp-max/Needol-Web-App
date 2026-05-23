import { Star } from "lucide-react";
import type { Review } from "@/lib/mockData";

export function ReviewCard({ r }: { r: Review }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <img src={r.reviewerAvatar} alt="" className="h-10 w-10 rounded-full object-cover" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{r.reviewer}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              r.tag === "Verified Hire" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
            }`}>{r.tag}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-3 w-3 ${i < r.rating ? "fill-accent text-accent" : "text-border"}`} />
              ))}
            </span>
            <span>· {r.date}</span>
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm text-foreground/90 leading-relaxed">{r.body}</p>
    </div>
  );
}
