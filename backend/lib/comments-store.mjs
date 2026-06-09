import { insertRow, selectMany, selectOne, updateRows } from "./supabase.mjs";

export async function createComment({ postId, authorId, parentCommentId = null, body }) {
  return insertRow(
    "comments",
    {
      post_id: postId,
      author_id: authorId,
      parent_comment_id: parentCommentId,
      body,
    },
    { returning: "representation" },
  );
}

export async function getCommentById(id) {
  return selectOne("comments", `id=eq.${encodeURIComponent(id)}&select=*`);
}

export async function listCommentsForPost(postId, { limit = 200 } = {}) {
  return selectMany(
    "comments",
    `post_id=eq.${encodeURIComponent(postId)}&deleted_at=is.null&select=*&order=created_at.asc&limit=${Number(limit) || 200}`,
  );
}

export async function updateCommentBody({ id, body }) {
  await updateRows(
    "comments",
    `id=eq.${encodeURIComponent(id)}`,
    { body },
  );
  return getCommentById(id);
}

export async function softDeleteComment(id) {
  await updateRows(
    "comments",
    `id=eq.${encodeURIComponent(id)}`,
    { deleted_at: new Date().toISOString() },
  );
  return getCommentById(id);
}

export async function dailyCommentCountForAuthor(authorId, { now = new Date() } = {}) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const rows = await selectMany(
    "comments",
    `author_id=eq.${encodeURIComponent(authorId)}&deleted_at=is.null&created_at=gte.${encodeURIComponent(start.toISOString())}&select=id&limit=200`,
  );
  return rows.length;
}

export async function countCommentsForPosts(postIds) {
  if (!Array.isArray(postIds) || postIds.length === 0) return {};
  const idList = postIds.map((id) => `"${id}"`).join(",");
  const rows = await selectMany(
    "comments",
    `post_id=in.(${encodeURIComponent(idList)})&deleted_at=is.null&select=post_id`,
  );
  const counts = {};
  for (const row of rows) {
    counts[row.post_id] = (counts[row.post_id] || 0) + 1;
  }
  return counts;
}
