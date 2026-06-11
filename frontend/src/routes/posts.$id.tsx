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
          <div className="mt-8 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        )}

        {error && !loading && (
          <div className="mt-8 rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
            {error}
            {!user && (
              <p className="mt-3">
                <Link to="/login" className="font-semibold text-primary underline">
                  Sign in
                </Link>
                {" "}to view more.
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

            {/* Engagement bar */}
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3" data-test="engagement-bar">
              <button
                type="button"
                onClick={toggleLike}
                disabled={!canInteract}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                  post.isLiked
                    ? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-300"
                    : "border-border text-foreground hover:bg-muted"
                } disabled:opacity-50`}
                data-test="like-button"
              >
                <Heart className={`h-3.5 w-3.5 ${post.isLiked ? "fill-current" : ""}`} />
                {post.likeCount ?? 0} {post.likeCount === 1 ? "like" : "likes"}
              </button>
              <button
                type="button"
                onClick={toggleSave}
                disabled={!canInteract}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                  post.isSaved
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-foreground hover:bg-muted"
                } disabled:opacity-50`}
                data-test="save-button"
              >
                <Bookmark className={`h-3.5 w-3.5 ${post.isSaved ? "fill-current" : ""}`} />
                {post.isSaved ? "Saved" : "Save"}
              </button>
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                <MessageCircle className="h-3.5 w-3.5" />
                {post.commentCount ?? 0} {post.commentCount === 1 ? "comment" : "comments"}
              </span>
              {!user && (
                <span className="text-xs text-muted-foreground">
                  <Link to="/login" className="font-semibold text-primary underline">Sign in</Link> to like, save, or comment.
                </span>
              )}
            </div>

            {Array.isArray(post.links) && post.links.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-sm font-semibold text-foreground">Links</h2>
                <ul className="mt-3 space-y-2">
                  {post.links.map((link, i) => (
                    <li key={`${link.url}-${i}`}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {link.title || link.url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Comments — only for kind='need' */}
            {post.kind === "need" && (
              <section className="space-y-4" data-test="comments-section">
                <h2 className="text-base font-bold text-foreground">Comments ({post.commentCount ?? 0})</h2>

                {canInteract && post.canComment && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void submitComment(null, commentBody);
                    }}
                    className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4"
                  >
                    <textarea
                      value={commentBody}
                      onChange={(e) => setCommentBody(e.target.value)}
                      maxLength={1500}
                      rows={3}
                      placeholder="Share what you can help with…"
                      className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                      data-test="comment-textarea"
                    />
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-muted-foreground">{commentBody.length}/1500 · phone/email auto-stripped</span>
                      <button
                        type="submit"
                        disabled={submittingComment || !commentBody.trim()}
                        className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        data-test="comment-submit"
                      >
                        {submittingComment ? "Posting…" : "Post comment"}
                      </button>
                    </div>
                    {commentError && <p className="text-xs text-destructive">{commentError}</p>}
                  </form>
                )}

                {topLevel.length === 0 && (
                  <p className="text-sm text-muted-foreground">No comments yet. Be the first.</p>
                )}

                <div className="space-y-3">
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
                </div>
              </section>
            )}

            {!user && (
              <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                You're viewing a public summary. <Link to="/login" className="font-semibold text-primary underline">Sign in</Link> to see the full description and connect with the author.
              </div>
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
  comment, replies, user, replyTo, setReplyTo, replyBody, setReplyBody,
  submittingComment, submitReply, toggleCommentLike, deleteComment,
}: CommentNodeProps) {
  const isReplying = replyTo === comment.id;
  return (
    <div className="rounded-2xl border border-border bg-card p-4" data-test="comment-item" data-comment-id={comment.id}>
      <div className="flex items-start gap-3">
        {comment.author.avatar && (
          <img src={comment.author.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
        )}
        <div className="flex-1">
          <p className="text-sm">
            <Link to="/p/$username" params={{ username: comment.author.username || "" }} className="font-semibold text-foreground hover:underline">
              {comment.author.name || comment.author.username || "User"}
            </Link>
            <span className="ml-2 text-xs text-muted-foreground">
              {new Date(comment.created_at).toLocaleString()}
            </span>
          </p>
          <p className="mt-1 whitespace-pre-line text-sm leading-6 text-foreground">{comment.body}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => toggleCommentLike(comment)}
              disabled={user?.status !== "active"}
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold transition ${
                comment.isLiked ? "text-rose-600 dark:text-rose-300" : "text-muted-foreground hover:text-foreground"
              } disabled:opacity-50`}
            >
              <Heart className={`h-3 w-3 ${comment.isLiked ? "fill-current" : ""}`} />
              {comment.likeCount}
            </button>
            {user && (
              <button
                type="button"
                onClick={() => setReplyTo(isReplying ? null : comment.id)}
                className="rounded-lg px-2 py-1 font-semibold text-muted-foreground hover:text-foreground"
              >
                {isReplying ? "Cancel" : "Reply"}
              </button>
            )}
            {comment.isAuthor && (
              <button
                type="button"
                onClick={() => deleteComment(comment)}
                className="rounded-lg px-2 py-1 font-semibold text-muted-foreground hover:text-destructive"
              >
                Delete
              </button>
            )}
          </div>

          {isReplying && (
            <form
              onSubmit={(e) => { e.preventDefault(); void submitReply(replyBody); }}
              className="mt-3 flex flex-col gap-2"
            >
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                rows={2}
                maxLength={1500}
                placeholder="Write a reply…"
                className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingComment || !replyBody.trim()}
                  className="rounded-xl bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  Post reply
                </button>
              </div>
            </form>
          )}

          {replies.length > 0 && (
            <div className="mt-3 space-y-2 border-l-2 border-border pl-4">
              {replies.map((r) => (
                <div key={r.id} className="rounded-xl border border-border bg-background p-3" data-test="comment-reply" data-comment-id={r.id}>
                  <p className="text-xs">
                    <span className="font-semibold text-foreground">{r.author.name || r.author.username || "User"}</span>
                    <span className="ml-2 text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                  </p>
                  <p className="mt-1 whitespace-pre-line text-xs leading-5 text-foreground">{r.body}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => toggleCommentLike(r)}
                      disabled={user?.status !== "active"}
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold transition ${
                        r.isLiked ? "text-rose-600 dark:text-rose-300" : "text-muted-foreground hover:text-foreground"
                      } disabled:opacity-50`}
                    >
                      <Heart className={`h-3 w-3 ${r.isLiked ? "fill-current" : ""}`} />
                      {r.likeCount}
                    </button>
                    {r.isAuthor && (
                      <button
                        type="button"
                        onClick={() => deleteComment(r)}
                        className="rounded-lg px-2 py-1 font-semibold text-muted-foreground hover:text-destructive"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
