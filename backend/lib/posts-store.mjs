import {
  insertRow,
  selectMany,
  selectOne,
  updateRows,
} from "./supabase.mjs";
import { emitNotification } from "./notifications-store.mjs";

const COMMON_SELECT = "*";

export async function createPost({
  authorId,
  kind,
  title,
  description,
  thumbnailUrl,
  scope,
  scopeCountry,
  scopeState,
  scopeCity,
  scopeLat,
  scopeLng,
  scopeRadiusKm,
  links,
  payload,
  status = "pending",
}) {
  return insertRow(
    "posts",
    {
      author_id: authorId,
      kind,
      status,
      title,
      description,
      thumbnail_url: thumbnailUrl ?? null,
      scope,
      scope_country: scopeCountry ?? null,
      scope_state: scopeState ?? null,
      scope_city: scopeCity ?? null,
      scope_lat: scopeLat ?? null,
      scope_lng: scopeLng ?? null,
      scope_radius_km: scopeRadiusKm ?? null,
      links: links ?? [],
      payload: payload ?? {},
    },
    { returning: "representation" },
  );
}

export async function getPost(id) {
  return selectOne(
    "posts",
    `id=eq.${encodeURIComponent(id)}&select=${COMMON_SELECT}`,
  );
}

export async function listPosts({
  status,
  kind,
  authorId,
  scopeCountry,
  scopeState,
  scopeCity,
  pinnedFirst = true,
  limit = 50,
  offset = 0,
} = {}) {
  const params = new URLSearchParams();
  params.set("select", COMMON_SELECT);
  if (status) params.set("status", `eq.${status}`);
  if (kind) params.set("kind", `eq.${kind}`);
  if (authorId) params.set("author_id", `eq.${authorId}`);
  if (scopeCountry) params.set("scope_country", `eq.${scopeCountry}`);
  if (scopeState) params.set("scope_state", `eq.${scopeState}`);
  if (scopeCity) params.set("scope_city", `eq.${scopeCity}`);
  const orderParts = [];
  if (pinnedFirst) orderParts.push("pinned.desc");
  orderParts.push("created_at.desc");
  params.set("order", orderParts.join(","));
  params.set("limit", String(limit));
  if (offset) params.set("offset", String(offset));
  return selectMany("posts", params.toString());
}

export async function listMyPosts(authorId) {
  return listPosts({ authorId, limit: 200, pinnedFirst: false });
}

export async function listPostsForAdmin({ status, kind, limit = 100 } = {}) {
  return listPosts({
    status,
    kind,
    pinnedFirst: false,
    limit,
  });
}

export async function approvePost(id, moderatorId) {
  await updateRows("posts", `id=eq.${encodeURIComponent(id)}`, {
    status: "approved",
    moderated_by: moderatorId,
    moderated_at: new Date().toISOString(),
    rejected_reason: null,
  });
  const row = await getPost(id);
  if (row?.author_id) {
    await emitNotification({
      userId: row.author_id,
      eventType: "post_approved",
      payload: { postId: row.id, kind: row.kind, title: row.title },
    });
  }
  return row;
}

export async function rejectPost(id, moderatorId, reason) {
  await updateRows("posts", `id=eq.${encodeURIComponent(id)}`, {
    status: "rejected",
    moderated_by: moderatorId,
    moderated_at: new Date().toISOString(),
    rejected_reason: reason || null,
  });
  const row = await getPost(id);
  if (row?.author_id) {
    await emitNotification({
      userId: row.author_id,
      eventType: "post_rejected",
      payload: { postId: row.id, kind: row.kind, title: row.title, reason: reason || null },
    });
  }
  return row;
}

export async function pinPost(id, moderatorId) {
  await updateRows("posts", `id=eq.${encodeURIComponent(id)}`, {
    pinned: true,
    moderated_by: moderatorId,
    moderated_at: new Date().toISOString(),
  });
  return getPost(id);
}

export async function unpinPost(id, moderatorId) {
  await updateRows("posts", `id=eq.${encodeURIComponent(id)}`, {
    pinned: false,
    moderated_by: moderatorId,
    moderated_at: new Date().toISOString(),
  });
  return getPost(id);
}

export async function closePost(id) {
  await updateRows("posts", `id=eq.${encodeURIComponent(id)}`, {
    status: "closed",
    closed_at: new Date().toISOString(),
  });
  return getPost(id);
}

// Count of posts in the current calendar month by author + kind (PRD §5.3 / §6.1).
export async function monthlyPostCount(authorId, kind) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const params = new URLSearchParams();
  params.set("select", "id");
  params.set("author_id", `eq.${authorId}`);
  params.set("kind", `eq.${kind}`);
  params.set("created_at", `gte.${start.toISOString()}`);
  params.set("limit", "1000");
  const rows = await selectMany("posts", params.toString());
  return rows.length;
}

export async function countByStatus(status) {
  const params = new URLSearchParams();
  params.set("select", "id");
  params.set("status", `eq.${status}`);
  params.set("limit", "10000");
  const rows = await selectMany("posts", params.toString());
  return rows.length;
}
