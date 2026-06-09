import { insertRow, selectMany, selectOne } from "./supabase.mjs";
import { env } from "./env.mjs";

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

export async function follow({ followerId, followeeId }) {
  if (!followerId || !followeeId || followerId === followeeId) {
    return { created: false, reason: "invalid" };
  }
  try {
    const row = await insertRow(
      "follows",
      { follower_id: followerId, followee_id: followeeId },
      { returning: "representation" },
    );
    return { created: true, row };
  } catch (err) {
    if (String(err?.message || "").includes("23505")) {
      return { created: false, reason: "already_following" };
    }
    throw err;
  }
}

export async function unfollow({ followerId, followeeId }) {
  await deleteRow(
    "follows",
    `follower_id=eq.${encodeURIComponent(followerId)}&followee_id=eq.${encodeURIComponent(followeeId)}`,
  );
}

export async function isFollowing({ followerId, followeeId }) {
  if (!followerId || !followeeId) return false;
  const row = await selectOne(
    "follows",
    `follower_id=eq.${encodeURIComponent(followerId)}&followee_id=eq.${encodeURIComponent(followeeId)}&select=id`,
  );
  return Boolean(row);
}

export async function countsForUser(userId) {
  const [followers, following] = await Promise.all([
    selectMany("follows", `followee_id=eq.${encodeURIComponent(userId)}&select=id&limit=10000`),
    selectMany("follows", `follower_id=eq.${encodeURIComponent(userId)}&select=id&limit=10000`),
  ]);
  return { followers: followers.length, following: following.length };
}

export async function listFollowingForUser(userId, { limit = 100 } = {}) {
  return selectMany(
    "follows",
    `follower_id=eq.${encodeURIComponent(userId)}&select=followee_id,created_at&order=created_at.desc&limit=${Number(limit) || 100}`,
  );
}
