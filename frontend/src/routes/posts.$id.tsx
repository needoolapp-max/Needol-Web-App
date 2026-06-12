import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { TopNav } from "@/components/nav/TopNav";
import { Footer } from "@/components/nav/Footer";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, ApiError } from "@/lib/api";
import { ArrowLeft, Bookmark, Heart, MapPin, MessageCircle } from "lucide-react";

type PostRow = {
  id: string;
  kind: "need" | "opportunity" | "event";
  status: string;
  title: string;
  description: string;
  thumbnail_url?: string | null;
  scope?: string;
  scope_country?: string | null;
  scope_state?: string | null;
  scope_city?: string | null;
  scope_lat?: number | null;
  scope_lng?: number | null;
  scope_radius_km?: number | null;
  links?: Array<{ title?: string; url?: string }>;
  payload?: Record<string, unknown>;
  pinned?: boolean;
  author_id?: string;
  created_at?: string;
  closed_at?: string | null;
  isAuthor?: boolean;
  canComment?: boolean;
  likeCount?: number;
  saveCount?: number;
  commentCount?: number;
  isLiked?: boolean;
  isSaved?: boolean;
};

type CommentRow = {
  id: string;
  post_id: string;
  parent_comment_id?: string | null;
  body: string;
  created_at: string;
  updated_at?: string;
  author: { id: string; username?: string | null; name?: string | null; avatar?: string | null };
  likeCount: number;
  isLiked: boolean;
  isAuthor: boolean;
  editable: boolean;
};

export const Route = createFileRoute("/posts/$id")({
  head: ({ params }) => {
    const title = `Post — Needool`;
    const url = `${(import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) || "https://needool.com"}/posts/${params.id}`;
    return {
      meta: [
        { title },
        { property: "og:title", content: title },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [
        { rel: "canonical", href: url },
      ],
    };
  },
  component: PostDetail,
});

function formatLocation(post: PostRow): string {
  const parts = [post.scope_city, post.scope_state, post.scope_country].filter(Boolean);
  if (parts.length) return parts.join(", ");
  if (post.scope === "worldwide") return "Worldwide";
  return "Anywhere";
}

function PostDetail() {
  const { id } = Route.useParams();
  const { user, getToken, loading: authLoading } = useAuth();
  const [post, setPost] = useState<PostRow | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const canInteract = user?.status === "active";

  const reloadPost = useCallback(async () => {
    try {
      const r = await apiFetch<{ data: PostRow }>(`/api/posts/${encodeURIComponent(id)}`, { getToken });
      setPost(r.data);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 401 ? "Sign in to view this post." : err.message);
      } else {
        setError("Failed to load post.");
      }
    }
  }, [id, getToken]);

  const reloadComments = useCallback(async () => {
    try {
      const r = await apiFetch<{ data: CommentRow[] }>(`/api/posts/${encodeURIComponent(id)}/comments`, { getToken });
      setComments(r.data || []);
    } catch {
      /* leave existing list */
    }
  }, [id, getToken]);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([reloadPost(), reloadComments()]).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [authLoading, reloadPost, reloadComments, user?.id]);

  async function toggleLike() {
    if (!user || !post) return;
    const wasLiked = post.isLiked;
    try {
      const result = await apiFetch<{ data: { liked: boolean; likeCount: number } }>(
        `/api/posts/${encodeURIComponent(post.id)}/like`,
        { method: wasLiked ? "DELETE" : "POST", getToken },
      );
      setPost({ ...post, isLiked: result.data.liked, likeCount: result.data.likeCount });
    } catch {
      /* ignore */
    }
  }

  async function toggleSave() {
    if (!user || !post) return;
    const wasSaved = post.isSaved;
    try {
      await apiFetch(
        `/api/posts/${encodeURIComponent(post.id)}/save`,
        { method: wasSaved ? "DELETE" : "POST", getToken },
      );
      setPost({ ...post, isSaved: !wasSaved, saveCount: (post.saveCount || 0) + (wasSaved ? -1 : 1) });
    } catch {
      /* ignore */
    }
  }

  async function submitComment(parentId: string | null, text: string) {
    if (!post || !text.trim()) return;
    setSubmittingComment(true);
    setCommentError(null);
    try {
      await apiFetch(`/api/posts/${encodeURIComponent(post.id)}/comments`, {
        method: "POST",
        getToken,
        body: JSON.stringify({ body: text.trim(), parent_comment_id: parentId || undefined }),
      });
      if (parentId) {
        setReplyTo(null);
        setReplyBody("");
      } else {
        setCommentBody("");
      }
      await Promise.all([reloadComments(), reloadPost()]);
    } catch (err) {
      setCommentError(err instanceof ApiError ? err.message : "Could not post comment.");
    } finally {
      setSubmittingComment(false);
    }
  }

  async function toggleCommentLike(c: CommentRow) {
    if (!user) return;
    const wasLiked = c.isLiked;
    try {
      const result = await apiFetch<{ data: { liked: boolean; likeCount: number } }>(
        `/api/comments/${encodeURIComponent(c.id)}/like`,
        { method: wasLiked ? "DELETE" : "POST", getToken },
      );
      setComments((prev) =>
        prev.map((row) =>
          row.id === c.id ? { ...row, isLiked: result.data.liked, likeCount: result.data.likeCount } : row,
        ),
      );
    } catch {
      /* ignore */
    }
  }

  async function deleteComment(c: CommentRow) {
    if (!confirm("Delete this comment?")) return;
    try {
      await apiFetch(`/api/comments/${encodeURIComponent(c.id)}`, { method: "DELETE", getToken });
      await reloadComments();
    } catch {
      /* ignore */
    }
  }

  const topLevel = comments.filter((c) => !c.parent_comment_id);
  const repliesByParent = comments.reduce<Record<string, CommentRow[]>>((acc, c) => {
    if (c.parent_comment_id) {
      acc[c.parent_comment_id] = acc[c.parent_comment_id] || [];
      acc[c.parent_comment_id].push(c);
    }
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link
          to="/needs"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to feed
        </Link>

        {loading && (
          <div className="mt-8 border border-dashed border-border p-10 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Loading
          </div>
        )}

        {error && !loading && (
          <div className="mt-8 border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
            {error}
            {!user && (
              <p className="mt-3">
                <Link
                  to="/login"
                  className="font-semibold text-foreground underline underline-offset-4"
                >
                  Sign in
                </Link>{" "}
                to view more.
              </p>
            )}
          </div>
        )}

        {!loading && !error && post && (
          <article className="mt-8 space-y-8">
            <header className="border-t-2 border-foreground pt-6">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                {post.kind === "need" ? "Need Request" : post.kind === "opportunity" ? "Opportunity" : "Event"}
                {post.status && <span className="ml-3 text-foreground">{post.status.toUpperCase()}</span>}
                {post.pinned && <span className="ml-3 text-primary">Pinned</span>}
              </p>
              <h1 className="mt-4 max-w-3xl font-heading text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl">
                {post.title}
              </h1>
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 text-foreground">
                  <MapPin className="h-3 w-3" /> {formatLocation(post)}
                </span>
              </div>
            </header>

            <div className="max-w-prose whitespace-pre-line text-base leading-[1.75] text-foreground">
              {post.description || "No description provided."}
            </div>

            {/* Engagement bar — hairline ruled strip, mono counts. */}
            <div
              className="flex flex-wrap items-center justify-between gap-3 border-y border-border py-3"
              data-test="engagement-bar"
            >
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={toggleLike}
                  disabled={!canInteract}
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    post.isLiked
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card text-foreground hover:border-foreground"
                  }`}
                  data-test="like-button"
                >
                  <Heart className={`h-3.5 w-3.5 ${post.isLiked ? "fill-current" : ""}`} />
                  {post.likeCount ?? 0}
                  <span className="font-medium">{post.likeCount === 1 ? "Like" : "Likes"}</span>
                </button>
                <button
                  type="button"
                  onClick={toggleSave}
                  disabled={!canInteract}
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    post.isSaved
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card text-foreground hover:border-foreground"
                  }`}
                  data-test="save-button"
                >
                  <Bookmark className={`h-3.5 w-3.5 ${post.isSaved ? "fill-current" : ""}`} />
                  {post.isSaved ? "Saved" : "Save"}
                </button>
                <span className="inline-flex min-h-9 items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {post.commentCount ?? 0}
                  <span className="font-medium">
                    {post.commentCount === 1 ? "Comment" : "Comments"}
                  </span>
                </span>
              </div>
              {!user && (
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  <Link to="/login" className="font-semibold text-foreground underline underline-offset-4">
                    Sign in
                  </Link>{" "}
                  to like, save, comment
                </span>
              )}
            </div>

            {Array.isArray(post.links) && post.links.length > 0 && (
              <section>
                <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/80">
                  Links
                </h2>
                <ul className="mt-3 divide-y divide-border border-y border-border">
                  {post.links.map((link, i) => (
                    <li key={`${link.url}-${i}`}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-3 py-3 text-sm text-foreground transition-colors hover:text-primary"
                      >
                        <span className="truncate">{link.title || link.url}</span>
                        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          Visit
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Comments — only for kind='need' */}
            {post.kind === "need" && (
              <section className="space-y-6" data-test="comments-section">
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/80">
                    Comments
                  </h2>
                  <span className="font-mono text-[11px] font-semibold tracking-[0.16em] text-foreground/70">
                    {String(post.commentCount ?? 0).padStart(2, "0")}
                  </span>
                </div>

                {canInteract && post.canComment && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void submitComment(null, commentBody);
                    }}
                    className="flex flex-col gap-3"
                  >
                    <textarea
                      value={commentBody}
                      onChange={(e) => setCommentBody(e.target.value)}
                      maxLength={1500}
                      rows={3}
                      placeholder="Share what you can help with…"
                      className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      data-test="comment-textarea"
                    />
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        {commentBody.length}/1500 &middot; Phone/email auto-stripped
                      </span>
                      <button
                        type="submit"
                        disabled={submittingComment || !commentBody.trim()}
                        className="inline-flex min-h-10 items-center rounded-lg bg-foreground px-4 py-2 text-sm font-bold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        data-test="comment-submit"
                      >
                        {submittingComment ? "Posting…" : "Post comment"}
                      </button>
                    </div>
                    {commentError && (
                      <p className="text-xs text-destructive">{commentError}</p>
                    )}
                  </form>
                )}

                {topLevel.length === 0 && (
                  <p className="border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    No comments yet. Be the first.
                  </p>
                )}

                <ul className="divide-y divide-border border-y border-border">
                  {topLevel.map((c) => (
                    <CommentNode
                      key={c.id}
                      comment={c}
                      replies={repliesByParent[c.id] || []}
                      user={user}
                      replyTo={replyTo}
                      setReplyTo={setReplyTo}
                      replyBody={replyBody}
                      setReplyBody={setReplyBody}
                      submittingComment={submittingComment}
                      submitReply={(text) => submitComment(c.id, text)}
                      toggleCommentLike={toggleCommentLike}
                      deleteComment={deleteComment}
                    />
                  ))}
                </ul>
              </section>
            )}

            {!user && (
              <aside className="flex flex-col gap-2 border-y border-border py-5 text-sm leading-7">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/85">
                  Public summary
                </p>
                <p className="text-muted-foreground">
                  You're viewing a public summary.{" "}
                  <Link
                    to="/login"
                    className="font-semibold text-foreground underline underline-offset-4"
                  >
                    Sign in
                  </Link>{" "}
                  to see the full description and connect with the author.
                </p>
              </aside>
            )}
          </article>
        )}
      </main>
      <Footer />
    </div>
  );
}

type CommentNodeProps = {
  comment: CommentRow;
  replies: CommentRow[];
  user: ReturnType<typeof useAuth>["user"];
  replyTo: string | null;
  setReplyTo: (id: string | null) => void;
  replyBody: string;
  setReplyBody: (s: string) => void;
  submittingComment: boolean;
  submitReply: (text: string) => Promise<void>;
  toggleCommentLike: (c: CommentRow) => Promise<void>;
  deleteComment: (c: CommentRow) => Promise<void>;
};

function CommentNode({
  comment,
  replies,
  user,
  replyTo,
  setReplyTo,
  replyBody,
  setReplyBody,
  submittingComment,
  submitReply,
  toggleCommentLike,
  deleteComment,
}: CommentNodeProps) {
  const isReplying = replyTo === comment.id;
  return (
    <li className="py-5" data-test="comment-item" data-comment-id={comment.id}>
      <div className="flex items-start gap-3">
        {comment.author.avatar && (
          <img
            src={comment.author.avatar}
            alt=""
            loading="lazy"
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Link
              to="/p/$username"
              params={{ username: comment.author.username || "" }}
              className="text-sm font-semibold text-foreground hover:underline"
            >
              {comment.author.name || comment.author.username || "User"}
            </Link>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {new Date(comment.created_at).toLocaleString()}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-line text-sm leading-6 text-foreground">
            {comment.body}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em]">
            <button
              type="button"
              onClick={() => toggleCommentLike(comment)}
              disabled={user?.status !== "active"}
              className={`inline-flex items-center gap-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                comment.isLiked
                  ? "text-rose-500 dark:text-rose-300"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Heart className={`h-3 w-3 ${comment.isLiked ? "fill-current" : ""}`} />
              {comment.likeCount}
            </button>
            {user && (
              <button
                type="button"
                onClick={() => setReplyTo(isReplying ? null : comment.id)}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {isReplying ? "Cancel" : "Reply"}
              </button>
            )}
            {comment.isAuthor && (
              <button
                type="button"
                onClick={() => deleteComment(comment)}
                className="text-muted-foreground transition-colors hover:text-destructive"
              >
                Delete
              </button>
            )}
          </div>

          {isReplying && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submitReply(replyBody);
              }}
              className="mt-3 flex flex-col gap-2"
            >
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                rows={2}
                maxLength={1500}
                placeholder="Write a reply…"
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-xs text-foreground transition-colors focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingComment || !replyBody.trim()}
                  className="inline-flex min-h-9 items-center rounded-lg bg-foreground px-3 py-1.5 text-xs font-bold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Post reply
                </button>
              </div>
            </form>
          )}

          {replies.length > 0 && (
            <ul className="mt-4 space-y-4 border-l border-border pl-4">
              {replies.map((r) => (
                <li
                  key={r.id}
                  data-test="comment-reply"
                  data-comment-id={r.id}
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-xs font-semibold text-foreground">
                      {r.author.name || r.author.username || "User"}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-line text-xs leading-5 text-foreground">
                    {r.body}
                  </p>
                  <div className="mt-1.5 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em]">
                    <button
                      type="button"
                      onClick={() => toggleCommentLike(r)}
                      disabled={user?.status !== "active"}
                      className={`inline-flex items-center gap-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        r.isLiked
                          ? "text-rose-500 dark:text-rose-300"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Heart className={`h-3 w-3 ${r.isLiked ? "fill-current" : ""}`} />
                      {r.likeCount}
                    </button>
                    {r.isAuthor && (
                      <button
                        type="button"
                        onClick={() => deleteComment(r)}
                        className="text-muted-foreground transition-colors hover:text-destructive"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}
