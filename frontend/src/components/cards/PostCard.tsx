import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Bookmark,
  Calendar,
  Clock,
  Heart,
  MapPin,
  MessageCircle,
  Pin,
  Sparkles,
  Tag,
  type LucideIcon,
} from "lucide-react";

import { AnimatedStatusBadge } from "@/components/ui/animated-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type PostKind = "need" | "opportunity" | "event";

export type PostCardRow = {
  id: string;
  kind: PostKind;
  title: string;
  description?: string;
  scope?: string;
  scope_country?: string | null;
  scope_state?: string | null;
  scope_city?: string | null;
  created_at?: string;
  pinned?: boolean;
  likeCount?: number;
  saveCount?: number;
  commentCount?: number;
  isLiked?: boolean;
  isSaved?: boolean;
};

type PostCardProps = {
  post: PostCardRow;
  index?: number;
};

const KIND_LABEL: Record<PostKind, string> = {
  need: "Need Request",
  opportunity: "Opportunity",
  event: "Event",
};

const KIND_ICON: Record<PostKind, LucideIcon> = {
  need: Tag,
  opportunity: Sparkles,
  event: Calendar,
};

function formatLocation(post: PostCardRow): string {
  const parts = [post.scope_city, post.scope_state, post.scope_country].filter(Boolean);
  if (parts.length) return parts.join(", ");
  if (post.scope === "worldwide") return "Worldwide";
  return post.scope || "Anywhere";
}

function formatPostedAgo(iso?: string): string {
  if (!iso) return "Recently";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return "Today";
  if (diff < 2 * day) return "Yesterday";
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return d.toLocaleDateString();
}

export function PostCard({ post, index = 0 }: PostCardProps) {
  // Auto-trigger the AnimatedStatusBadge once per card on mount, staggered by
  // index. Reads as a quiet "post processed / verified" indicator the first
  // time the user lands on the feed. The badge resets itself after ~7s.
  const [trigger, setTrigger] = useState(false);
  useEffect(() => {
    const delay = 250 + Math.min(index, 5) * 300; // cap stagger at 6 cards
    const t = setTimeout(() => setTrigger(true), delay);
    return () => clearTimeout(t);
  }, [index]);

  const KindIcon = KIND_ICON[post.kind];

  return (
    <div className="relative">
      {/* AnimatedStatusBadge sits BEHIND the card (z-0) and slides up from
          underneath. The card itself is relative z-10 below. */}
      <AnimatedStatusBadge
        trigger={trigger}
        onAnimationComplete={() => setTrigger(false)}
      />
      <Card
        className={cn(
          "relative z-10 flex h-full flex-col overflow-hidden rounded-2xl border-border bg-card transition-colors",
          "hover:border-primary/60",
        )}
      >
        <CardHeader className="space-y-2 p-5 pb-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/80">
              <KindIcon className="h-3 w-3" />
              {KIND_LABEL[post.kind]}
            </span>
            {post.pinned && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                <Pin className="h-3 w-3" />
                Pinned
              </span>
            )}
          </div>
          <CardTitle className="line-clamp-2 font-heading text-lg font-bold leading-snug text-card-foreground">
            {post.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-4 p-5 pt-0">
          {post.description && (
            <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
              {post.description}
            </p>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {formatLocation(post)}
            </span>
            <span aria-hidden className="h-3 w-px bg-border" />
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatPostedAgo(post.created_at)}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  post.isLiked && "text-rose-500 dark:text-rose-300",
                )}
              >
                <Heart
                  className={cn("h-3.5 w-3.5", post.isLiked && "fill-current")}
                />
                {post.likeCount ?? 0}
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" />
                {post.commentCount ?? 0}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  post.isSaved && "text-primary",
                )}
              >
                <Bookmark
                  className={cn("h-3.5 w-3.5", post.isSaved && "fill-current")}
                />
                {post.saveCount ?? 0}
              </span>
            </div>

            <Button
              asChild
              size="sm"
              variant="ghost"
              className="h-8 gap-1 px-2 text-xs font-semibold text-primary hover:bg-primary/10"
            >
              <Link to="/posts/$id" params={{ id: post.id }}>
                View
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
