// PRD §12 — event catalog. Each entry defines the default channel set and the
// template used to render title/body from a payload object. Channels can be
// "in_app" and/or "email". Web push is out of scope for Phase 3B.
//
// Adding a new event:
// 1. Add an entry here with channels + title/body builders.
// 2. Call emitNotification({ userId, eventType, payload }) from the originating
//    flow in lib/* or server.mjs.

export const NOTIFICATION_EVENTS = {
  subscription_activated: {
    channels: ["in_app", "email"],
    title: () => "Subscription active",
    body: ({ plan, periodEnd }) =>
      `Your ${plan?.replace("_", " ") || "subscription"} is active${periodEnd ? ` through ${formatDate(periodEnd)}` : ""}.`,
  },
  subscription_expiring: {
    channels: ["in_app", "email"],
    title: () => "Subscription expiring soon",
    body: ({ daysLeft, periodEnd }) =>
      `Your subscription expires${periodEnd ? ` on ${formatDate(periodEnd)}` : ""}${daysLeft != null ? ` (${daysLeft} day${daysLeft === 1 ? "" : "s"} left)` : ""}. Renew to keep your profile active.`,
  },
  subscription_expired: {
    channels: ["in_app", "email"],
    title: () => "Subscription expired",
    body: () =>
      "Your subscription has expired. Your profile is now Inactive — renew to restore contact reveals and posting.",
  },
  renewal_window_open: {
    channels: ["in_app", "email"],
    title: () => "Renewal window open",
    body: ({ planCycle }) =>
      `You can now renew your ${planCycle || ""} plan${planCycle ? "" : " subscription"}.`,
  },
  referral_commission_earned: {
    channels: ["in_app", "email"],
    title: ({ rateLabel }) => `Referral commission earned${rateLabel ? ` (${rateLabel})` : ""}`,
    body: ({ amount, refereeUsername }) =>
      `You earned ${formatUsdt(amount)} from ${refereeUsername || "a referred user"}.`,
  },
  withdrawal_requested: {
    channels: ["in_app", "email"],
    title: () => "Withdrawal requested",
    body: ({ amount }) =>
      `Your ${formatUsdt(amount)} withdrawal is pending admin review.`,
  },
  withdrawal_approved: {
    channels: ["in_app", "email"],
    title: () => "Withdrawal approved",
    body: ({ amount }) =>
      `Your ${formatUsdt(amount)} withdrawal was approved and is queued for payout.`,
  },
  withdrawal_completed: {
    channels: ["in_app", "email"],
    title: () => "Withdrawal completed",
    body: ({ amount, txHash }) =>
      `Your ${formatUsdt(amount)} withdrawal was sent. ${txHash ? `Tx: ${shortTx(txHash)}` : ""}`.trim(),
  },
  withdrawal_failed: {
    channels: ["in_app", "email"],
    title: () => "Withdrawal failed",
    body: ({ amount, reason }) =>
      `Your ${formatUsdt(amount)} withdrawal could not be sent.${reason ? ` Reason: ${reason}` : ""}`,
  },
  post_approved: {
    channels: ["in_app", "email"],
    title: ({ kind }) => `${kindLabel(kind)} approved`,
    body: ({ title }) => `Your post "${title || "(untitled)"}" is now live.`,
  },
  post_rejected: {
    channels: ["in_app", "email"],
    title: ({ kind }) => `${kindLabel(kind)} rejected`,
    body: ({ title, reason }) =>
      `Your post "${title || "(untitled)"}" was rejected.${reason ? ` Reason: ${reason}` : ""}`,
  },
  hire_quote_paid: {
    channels: ["in_app", "email"],
    title: () => "Hire request paid",
    body: ({ employer, role }) =>
      `Payment received for ${employer || "the hire request"}${role ? ` (${role})` : ""}. A draft job opening is ready for publishing.`,
  },
  application_status_change: {
    channels: ["in_app", "email"],
    title: ({ status }) => `Application ${status || "updated"}`,
    body: ({ status, jobTitle }) =>
      `Your application${jobTitle ? ` for ${jobTitle}` : ""} is now ${status || "updated"}.`,
  },
  hired: {
    channels: ["in_app", "email"],
    title: () => "You were hired",
    body: ({ employer, jobTitle }) =>
      `${employer || "An employer"} marked you Hired${jobTitle ? ` for ${jobTitle}` : ""}. Trigger A review unlocks in 7 days.`,
  },
  review_received: {
    channels: ["in_app", "email"],
    title: ({ rating }) =>
      rating != null ? `${rating}★ review received` : "Review received",
    body: ({ reviewerName, rating }) =>
      `${reviewerName || "Someone"} left you a ${rating != null ? `${rating}★ ` : ""}review.`,
  },
  review_held: {
    channels: ["in_app"],
    title: () => "Low-rated review pending admin review",
    body: ({ reviewerName, rating }) =>
      `${reviewerName || "A member"} left a ${rating != null ? `${rating}★ ` : ""}review on your profile. Held for admin pre-approval per Needool's anti-abuse policy.`,
  },
  contact_viewed: {
    channels: ["in_app"],
    title: ({ intentType }) => {
      if (intentType === "phone") return "Someone viewed your phone";
      if (intentType === "whatsapp") return "Someone viewed your WhatsApp";
      if (intentType === "link") return "Someone opened one of your links";
      if (intentType === "cv") return "Someone opened your CV";
      return "Someone viewed your contact info";
    },
    body: ({ viewerName }) =>
      viewerName
        ? `${viewerName} just revealed your contact info.`
        : "A signed-in member just revealed your contact info.",
  },
  notify_active_interest: {
    channels: ["in_app", "email"],
    title: () => "Someone wants to connect",
    body: () =>
      "A signed-in member tapped 'Notify when active' on your profile. Activate your subscription to connect.",
  },
  notify_active_target_activated: {
    channels: ["in_app", "email"],
    title: () => "Member you waited on is now Active",
    body: () =>
      "A profile you asked to be notified about is now Active. You can view their full details now.",
  },
  comment_received: {
    channels: ["in_app", "email"],
    title: () => "New comment on your Need Request",
    body: () => "Someone commented on your Need Request.",
  },
  reply_received: {
    channels: ["in_app"],
    title: () => "New reply to your comment",
    body: () => "Someone replied to your comment.",
  },
  like_received: {
    channels: ["in_app"],
    title: ({ commentId }) => commentId ? "Someone liked your comment" : "Someone liked your post",
    body: ({ commentId }) => commentId ? "Your comment received a new like." : "Your post received a new like.",
  },
  new_follower: {
    channels: ["in_app"],
    title: () => "New follower",
    body: () => "Someone started following you.",
  },
};

export function getEventConfig(eventType) {
  return NOTIFICATION_EVENTS[eventType] || null;
}

export function renderNotification(eventType, payload = {}) {
  const cfg = getEventConfig(eventType);
  if (!cfg) {
    return {
      channels: ["in_app"],
      title: eventType,
      body: "",
    };
  }
  const title =
    typeof cfg.title === "function" ? cfg.title(payload) : String(cfg.title || eventType);
  const body =
    typeof cfg.body === "function" ? cfg.body(payload) : String(cfg.body || "");
  const channels = Array.isArray(cfg.channels) ? [...cfg.channels] : ["in_app"];
  return { channels, title, body };
}

export function shouldSendEmail(channels) {
  return Array.isArray(channels) && channels.includes("email");
}

// Helpers ------------------------------------------------------------------

function formatUsdt(amount) {
  if (amount == null) return "0.00 USDT";
  return `${Number(amount).toFixed(2)} USDT`;
}

function formatDate(value) {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function shortTx(hash) {
  if (!hash) return "";
  const s = String(hash);
  return s.length > 16 ? `${s.slice(0, 8)}…${s.slice(-6)}` : s;
}

function kindLabel(kind) {
  if (kind === "need") return "Need Request";
  if (kind === "opportunity") return "Opportunity";
  if (kind === "event") return "Event";
  return "Post";
}
