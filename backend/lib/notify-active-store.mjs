// IO layer for PRD §3.3 "Notify when active" + §3.4 contact intent.
import { insertRow, selectMany, selectOne, updateRows } from "./supabase.mjs";
import {
  NotifyActiveError,
  canRequestNotify,
  isRequestActive,
  viewerNameForContactIntent,
} from "./notify-active.mjs";
import { findUserById } from "./users.mjs";
import { emitNotification } from "./notifications-store.mjs";

// PRD §3.3 — create or refresh a pending request. If one already exists in
// the 30-day window we treat it as a no-op (idempotent for the requester).
export async function requestNotifyWhenActive({ targetUserId, requesterId, now = new Date() }) {
  const [target, requester] = await Promise.all([
    findUserById(targetUserId),
    findUserById(requesterId),
  ]);
  const gate = canRequestNotify({ target, requester });
  if (!gate.ok) throw new NotifyActiveError(gate.status, gate.reason, gate.code);

  const existing = await selectOne(
    "notify_when_active_requests",
    `target_user_id=eq.${encodeURIComponent(targetUserId)}` +
      `&requester_id=eq.${encodeURIComponent(requesterId)}` +
      `&status=eq.pending&select=*`,
  );
  if (existing && isRequestActive(existing, now)) {
    return { row: existing, created: false };
  }
  // Drop any expired pending row before inserting a fresh one (status moves
  // to 'expired' via the daily sweep; this branch is the in-line cleanup).
  if (existing) {
    await updateRows(
      "notify_when_active_requests",
      `id=eq.${encodeURIComponent(existing.id)}`,
      { status: "expired" },
    );
  }
  const row = await insertRow(
    "notify_when_active_requests",
    {
      target_user_id: targetUserId,
      requester_id: requesterId,
      status: "pending",
    },
    { returning: "representation" },
  );

  // PRD §3.3 — target receives notification, viewer identity hidden.
  await emitNotification({
    userId: targetUserId,
    eventType: "notify_active_interest",
    payload: { requestedAt: row.created_at },
  });

  return { row, created: true };
}

export async function listPendingRequestsForTarget(targetUserId, { now = new Date() } = {}) {
  const rows = await selectMany(
    "notify_when_active_requests",
    `target_user_id=eq.${encodeURIComponent(targetUserId)}&status=eq.pending&select=*`,
  );
  return rows.filter((r) => isRequestActive(r, now));
}

// Called from activateUser on transition. Fan-out to every still-pending
// requester, then mark the rows fulfilled.
export async function fanoutOnTargetActivation({ targetUserId, now = new Date() }) {
  const pending = await listPendingRequestsForTarget(targetUserId, { now });
  for (const row of pending) {
    try {
      await emitNotification({
        userId: row.requester_id,
        eventType: "notify_active_target_activated",
        payload: { targetUserId },
      });
    } catch (e) {
      console.warn(`[notify-active] fanout emit failed: ${e.message}`);
    }
  }
  if (pending.length > 0) {
    const ids = pending.map((r) => r.id);
    await updateRows(
      "notify_when_active_requests",
      `id=in.(${ids.map(encodeURIComponent).join(",")})`,
      { status: "fulfilled", fulfilled_at: now.toISOString() },
    );
  }
  return pending.length;
}

// Daily sweep — flips long-pending rows to 'expired'. Idempotent: only
// touches rows whose expires_at has actually passed.
export async function expireStalePendingRequests({ now = new Date() } = {}) {
  const rows = await selectMany(
    "notify_when_active_requests",
    `status=eq.pending&expires_at=lt.${encodeURIComponent(now.toISOString())}&select=id`,
  );
  if (rows.length === 0) return 0;
  const ids = rows.map((r) => r.id);
  await updateRows(
    "notify_when_active_requests",
    `id=in.(${ids.map(encodeURIComponent).join(",")})`,
    { status: "expired" },
  );
  return rows.length;
}

// PRD §3.4 — log a contact reveal + notify the profile owner. Viewer
// identity is shown to the owner only if the owner's profile is Active.
export async function logContactIntent({ targetUserId, viewerId, intent, now = new Date() }) {
  const [target, viewer] = await Promise.all([
    findUserById(targetUserId),
    viewerId ? findUserById(viewerId) : Promise.resolve(null),
  ]);
  if (!target) throw new NotifyActiveError(404, "Target not found.");
  if (viewer && viewer.id === target.id) {
    // Self-views don't generate notifications; still log for analytics.
  }
  await insertRow("contact_intent_log", {
    target_user_id: targetUserId,
    viewer_id: viewerId || null,
    intent_type: intent.intent_type,
    link_url: intent.link_url || null,
    created_at: now.toISOString(),
  }, { returning: "minimal" });

  // Emit only if viewer is signed in (PRD §3.4 says "logged-in viewer")
  // and viewer is not the target itself.
  if (viewer && viewer.id !== target.id) {
    const viewerName = viewerNameForContactIntent({ target, viewer });
    await emitNotification({
      userId: targetUserId,
      eventType: "contact_viewed",
      payload: {
        intentType: intent.intent_type,
        linkUrl: intent.link_url,
        viewerName, // null when target is Inactive — PRD §3.4
      },
    });
  }
  return { ok: true };
}
