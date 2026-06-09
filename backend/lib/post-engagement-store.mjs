import { insertRow, selectMany, selectOne } from "./supabase.mjs";
import { env } from "./env.mjs";

// Likes + saves for posts and comments. Tables enforce uniqueness so the
// `insertRow` upsert pattern is unnecessary — a duplicate insert returns 409
// from PostgREST which we treat as a no-op.

async function deleteRow(table, filter) {
  const url = `${env.SUPABASE_URL}/rest/v1/${table}?${filter}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Supabase DELETE ${table}?${filter} failed: ${response.status} ${await response.text()}`);
  }
}

async function safeInsert(table, row) {
  try {
    const res = await insertRow(table, row, { returning: "representation" });
    return { created: true, row: res };
  } catch (err) {
    // Postgres unique violation → no-op
    if (String(err?.message || "").includes("23505")) {
      return { created: false, reason: "already_exists" };
    }
    throw err;
  }
}

// Post likes -----------------------------------------------------------------

export async function likePost({ postId, userId }) {
  return safeInsert("post_likes", { post_id: postId, user_id: userId });
}

export async function unlikePost({ postId, userId }) {
  await deleteRow(
    "post_likes",
    `post_id=eq.${encodeURIComponent(postId)}&user_id=eq.${encodeURIComponent(userId)}`,
  );
}

export async function listLikesForPost(postId) {
  return selectMany(
    "post_likes",
    `post_id=eq.${encodeURIComponent(postId)}&select=user_id,created_at`,
  );
}

export async function getPostLike({ postId, userId }) {
  return selectOne(
    "post_likes",
    `post_id=eq.${encodeURIComponent(postId)}&user_id=eq.${encodeURIComponent(userId)}&select=id`,
  );
}

export async function countLikesForPosts(postIds) {
  if (!Array.isArray(postIds) || postIds.length === 0) return {};
  const idList = postIds.map((id) => `"${id}"`).join(",");
  const rows = await selectMany(
    "post_likes",
    `post_id=in.(${encodeURIComponent(idList)})&select=post_id`,
  );
  const counts = {};
  for (const row of rows) counts[row.post_id] = (counts[row.post_id] || 0) + 1;
  return counts;
}

// Post saves -----------------------------------------------------------------

export async function savePost({ postId, userId }) {
  return safeInsert("post_saves", { post_id: postId, user_id: userId });
}

export async function unsavePost({ postId, userId }) {
  await deleteRow(
    "post_saves",
    `post_id=eq.${encodeURIComponent(postId)}&user_id=eq.${encodeURIComponent(userId)}`,
  );
}

export async function getPostSave({ postId, userId }) {
  return selectOne(
    "post_saves",
    `post_id=eq.${encodeURIComponent(postId)}&user_id=eq.${encodeURIComponent(userId)}&select=id`,
  );
}

export async function countSavesForPosts(postIds) {
  if (!Array.isArray(postIds) || postIds.length === 0) return {};
  const idList = postIds.map((id) => `"${id}"`).join(",");
  const rows = await selectMany(
    "post_saves",
    `post_id=in.(${encodeURIComponent(idList)})&select=post_id`,
  );
  const counts = {};
  for (const row of rows) counts[row.post_id] = (counts[row.post_id] || 0) + 1;
  return counts;
}

export async function listSavedPostsForUser(userId, { limit = 100 } = {}) {
  // Return [{ post_id, saved_at }]; the route layer joins to the posts feed
  // separately to keep this lib simple.
  return selectMany(
    "post_saves",
    `user_id=eq.${encodeURIComponent(userId)}&select=post_id,created_at&order=created_at.desc&limit=${Number(limit) || 100}`,
  );
}

// Comment likes --------------------------------------------------------------

export async function likeComment({ commentId, userId }) {
  return safeInsert("comment_likes", { comment_id: commentId, user_id: userId });
}

export async function unlikeComment({ commentId, userId }) {
  await deleteRow(
    "comment_likes",
    `comment_id=eq.${encodeURIComponent(commentId)}&user_id=eq.${encodeURIComponent(userId)}`,
  );
}

export async function countLikesForComments(commentIds) {
  if (!Array.isArray(commentIds) || commentIds.length === 0) return {};
  const idList = commentIds.map((id) => `"${id}"`).join(",");
  const rows = await selectMany(
    "comment_likes",
    `comment_id=in.(${encodeURIComponent(idList)})&select=comment_id`,
  );
  const counts = {};
  for (const row of rows) counts[row.comment_id] = (counts[row.comment_id] || 0) + 1;
  return counts;
}

export async function listLikedCommentIdsForUser({ userId, commentIds }) {
  if (!Array.isArray(commentIds) || commentIds.length === 0) return new Set();
  const idList = commentIds.map((id) => `"${id}"`).join(",");
  const rows = await selectMany(
    "comment_likes",
    `user_id=eq.${encodeURIComponent(userId)}&comment_id=in.(${encodeURIComponent(idList)})&select=comment_id`,
  );
  return new Set(rows.map((r) => r.comment_id));
}
