import { insertRow, selectMany } from "./supabase.mjs";

// Best-effort write. Never let a failed audit insert break the underlying
// admin action — the action itself is the user-visible behavior; the audit
// row is observability.
export async function recordAdminAction({
  actorEmail,
  actorUserId = null,
  action,
  targetType = null,
  targetId = null,
  metadata = {},
  requestMethod = null,
  requestPath = null,
  status = "ok",
  errorMessage = null,
}) {
  try {
    await insertRow("admin_audit_log", {
      actor_email: actorEmail || "(unknown)",
      actor_user_id: actorUserId || null,
      action,
      target_type: targetType,
      target_id: targetId,
      metadata: metadata || {},
      request_method: requestMethod,
      request_path: requestPath,
      status,
      error_message: errorMessage,
    });
  } catch (err) {
    // Swallow: console only, never throw.
    console.warn("[audit-log] insert failed", err?.message);
  }
}

export async function listAuditLog({ action, actor, targetType, targetId, limit = 200 } = {}) {
  const params = new URLSearchParams();
  params.set("select", "*");
  if (action) params.set("action", `eq.${action}`);
  if (actor) params.set("actor_email", `eq.${String(actor).toLowerCase()}`);
  if (targetType) params.set("target_type", `eq.${targetType}`);
  if (targetId) params.set("target_id", `eq.${targetId}`);
  params.set("order", "created_at.desc");
  params.set("limit", String(Math.min(Number(limit) || 200, 500)));
  return selectMany("admin_audit_log", params.toString());
}
