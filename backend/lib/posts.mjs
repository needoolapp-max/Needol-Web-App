export const POST_KINDS = ["need", "opportunity", "event"];
export const POST_STATUSES = ["pending", "approved", "rejected", "closed"];
export const POST_SCOPES = ["worldwide", "country", "state", "city", "near"];

// PRD §5.3 / §6.1
const MONTHLY_LIMITS = {
  need: { Individual: 4, Business: 8 },
  opportunity: { Individual: 2, Business: 4 },
  event: { Individual: 0, Business: 0 },
};

export function monthlyPostLimit(accountType, kind) {
  return MONTHLY_LIMITS[kind]?.[accountType] ?? 0;
}

export function canCreatePostThisMonth({ accountType, kind, monthlyCount }) {
  const limit = monthlyPostLimit(accountType, kind);
  return monthlyCount < limit;
}

// PRD §5.1 — phones, emails, raw URLs auto-rejected from descriptions/titles.
// "Phone-shaped" means EITHER international `+` prefix with 7–15 digits OR a
// digit run containing at least one separator (space, dash, paren, dot). This
// avoids false positives on pure-digit run-ons like timestamps.
const PHONE_INTERNATIONAL_RE = /\+\d{7,15}/;
const PHONE_SEPARATED_RE = /\d{2,}[\s().\-]\d{2,}[\s().\-]?\d*/;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const URL_RE = /(?:https?:\/\/|www\.)\S+/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function containsContactInfo(text, { checkUrls = false } = {}) {
  if (!text) return false;
  if (PHONE_INTERNATIONAL_RE.test(text)) return true;
  if (PHONE_SEPARATED_RE.test(text)) {
    const match = text.match(PHONE_SEPARATED_RE);
    if (match && !ISO_DATE_RE.test(match[0].trim())) return true;
  }
  if (EMAIL_RE.test(text)) return true;
  if (checkUrls && URL_RE.test(text)) return true;
  return false;
}

// Strip patterns (used by legacy back-compat path only).
const PHONE_RE = /(?:\+?\d[\d\s().-]{6,}\d)/g;
const EMAIL_STRIP_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL_STRIP_RE = /\bhttps?:\/\/\S+|\bwww\.\S+/gi;

// Legacy strip helper — kept for places that still want sanitization (e.g.
// admin-side ingest of pre-existing data). PRD §5.1 prefers reject on
// new posts; use containsContactInfo + 400 there.
export function stripContactInfo(text, { stripUrls = false } = {}) {
  if (!text) return "";
  let cleaned = String(text).replace(PHONE_RE, (match) =>
    /^\d{4}-\d{2}-\d{2}$/.test(match.trim()) ? match : "[contact removed]",
  );
  cleaned = cleaned.replace(EMAIL_STRIP_RE, "[contact removed]");
  if (stripUrls) cleaned = cleaned.replace(URL_STRIP_RE, "[link removed]");
  return cleaned;
}

export function maxTitleLength(kind) {
  return kind === "event" ? 80 : 80;
}

export function maxDescriptionLength(kind) {
  return 1500;
}

export function maxLinksAllowed() {
  return 3;
}

export function visitorPostSummary(post) {
  if (!post) return null;
  const body = String(post.description || "");
  const summary = body.length > 150 ? `${body.slice(0, 150)}…` : body;
  return {
    id: post.id,
    kind: post.kind,
    title: post.title,
    thumbnail_url: post.thumbnail_url,
    status: post.status,
    created_at: post.created_at,
    pinned: post.pinned,
    description: summary,
    scope: post.scope,
    scope_country: post.scope_country,
    scope_state: post.scope_state,
    scope_city: post.scope_city,
  };
}

export function publicPostShape(post, { viewerIsAuthor = false, viewerSignedIn = false } = {}) {
  if (!post) return null;
  return {
    id: post.id,
    kind: post.kind,
    status: post.status,
    title: post.title,
    description: post.description,
    thumbnail_url: post.thumbnail_url,
    scope: post.scope,
    scope_country: post.scope_country,
    scope_state: post.scope_state,
    scope_city: post.scope_city,
    scope_lat: post.scope_lat,
    scope_lng: post.scope_lng,
    scope_radius_km: post.scope_radius_km,
    links: post.links || [],
    payload: post.payload || {},
    pinned: post.pinned,
    author_id: post.author_id,
    created_at: post.created_at,
    closed_at: post.closed_at,
    isAuthor: viewerIsAuthor,
    canComment: post.kind === "need" && viewerSignedIn && post.status === "approved",
  };
}

// PRD §6.1 — visitors cannot see opportunity detail at all.
// Visitors can see need summaries; full detail requires signed-in.
export function visibleToVisitor(kind) {
  if (kind === "need") return "summary";
  if (kind === "event") return "summary";
  return "none";
}

export function isModuleRestricted(user, moduleName) {
  if (!user) return false;
  if (user.status === "banned") return true;
  if (user.status === "restricted") {
    const list = Array.isArray(user.module_restrictions)
      ? user.module_restrictions
      : [];
    return list.includes(moduleName);
  }
  return false;
}
