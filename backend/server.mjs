import http from "node:http";
import { env, isDev, isAdminEmail } from "./lib/env.mjs";
import { selectMany } from "./lib/supabase.mjs";
import { TIERS, clientIp, consume, tierFor } from "./lib/rate-limit.mjs";
import {
  CSRF_COOKIE,
  CSRF_HEADER,
  buildCsrfCookie,
  checkCsrf,
  issueCsrfToken,
  readCookie,
} from "./lib/csrf.mjs";
import {
  AuthError,
  fetchClerkUser,
  verifyClerkSession,
  verifyClerkWebhook,
} from "./lib/clerk.mjs";
import {
  buildOrderId,
  createInvoice,
  parseOrderId,
  registerOrderHandler,
  resolveOrderHandler,
  SUCCESS_STATUS,
  verifyIpnSignature,
} from "./lib/nowpayments.mjs";
import { PLAN_CATALOG, getPlan } from "./lib/subscriptions.mjs";
import {
  findUserById,
  findUserByReferralCode,
  findUserByUsername,
  listUsersForAdmin,
  publicUserShape,
  softDeleteUser,
  upsertUserFromClerk,
} from "./lib/users.mjs";
import {
  SignupError,
  pickBusinessSignup,
  pickIndividualSignup,
} from "./lib/signup.mjs";
import {
  LINK_LABEL_MAX,
  MAX_FILE_BYTES,
  ProfileError,
  SKILL_KINDS,
  SKILL_LABEL_MAX,
  linkCap,
  skillCap,
} from "./lib/profile.mjs";
import {
  addLink,
  addSkill,
  listLinks,
  listSkills,
  removeLink,
  removeSkill,
  setCvPath,
  setProfilePicturePath,
  updateProfile,
} from "./lib/profile-store.mjs";
import {
  deleteObject,
  extractPdfText,
  publicUrl,
  uploadObject,
} from "./lib/storage.mjs";
import {
  NotifyActiveError,
  pickContactIntent,
} from "./lib/notify-active.mjs";
import {
  expireStalePendingRequests,
  logContactIntent,
  requestNotifyWhenActive,
} from "./lib/notify-active-store.mjs";
import { SearchError, pickSearchInput } from "./lib/search.mjs";
import { searchUsers } from "./lib/search-store.mjs";
import { HelpError } from "./lib/help.mjs";
import {
  archiveArticle,
  createArticle,
  findArticleById,
  findArticleBySlug,
  listAllArticlesForAdmin,
  listArticleCategories,
  listPublishedArticles,
  publishArticle,
  updateArticle,
} from "./lib/help-store.mjs";
import {
  MANDATORY_EVENT_TYPES,
  NotificationPrefError,
} from "./lib/notification-prefs.mjs";
import {
  listPreferences,
  setPreference,
} from "./lib/notification-prefs-store.mjs";
import { PushSubError } from "./lib/push-subscriptions.mjs";
import {
  deletePushSubscription,
  listPushSubscriptionsForUser,
  upsertPushSubscription,
} from "./lib/push-subscriptions-store.mjs";
import {
  activateOrExtendSubscription,
  assertEligibleToSubscribe,
  devSetSubscriptionExpiry,
  getLatestSubscription,
  runExpiryTick,
  SubscriptionEligibilityError,
} from "./lib/subscription-store.mjs";
import { getPaymentById, recordPayment } from "./lib/payments-store.mjs";
import {
  POST_KINDS,
  POST_SCOPES,
  canCreatePostThisMonth,
  containsContactInfo,
  isModuleRestricted,
  maxDescriptionLength,
  maxLinksAllowed,
  maxTitleLength,
  publicPostShape,
  stripContactInfo,
  visibleToVisitor,
  visitorPostSummary,
} from "./lib/posts.mjs";
import {
  approvePost,
  closePost,
  countByStatus,
  createPost,
  getPost,
  listMyPosts,
  listPosts,
  listPostsForAdmin,
  monthlyPostCount,
  pinPost,
  rejectPost,
  unpinPost,
} from "./lib/posts-store.mjs";
import {
  ALLOWED_MODULES,
  banUser,
  ModerationError,
  restrictUser,
  unbanUser,
  unrestrictUser,
} from "./lib/users-moderation.mjs";
import {
  HireRequestValidationError,
  pickHireRequestInput,
  quoteExpiryDate,
  validateHireRequestInput,
} from "./lib/hire-requests.mjs";
import {
  OtpError,
  pickOtpRequest,
  pickOtpVerify,
} from "./lib/hire-request-otp.mjs";
import {
  assertVerificationConsumed,
  issueOtp,
  verifyOtp,
} from "./lib/hire-request-otp-store.mjs";
import {
  cancel as cancelHireRequest,
  createHireRequest,
  getHireRequestById,
  listHireRequests,
  markPaid as markHireRequestPaid,
  promote as promoteHireRequest,
  setQuote,
} from "./lib/hire-requests-store.mjs";
import {
  isUserEligible,
  JOB_EMPLOYMENT_TYPES,
  publicJobOpeningShape,
} from "./lib/job-openings.mjs";
import {
  closeJobOpening,
  createJobOpening,
  getJobOpeningById,
  listJobOpenings,
  listQuestions,
  publishJobOpening,
  replaceQuestions,
  updateJobOpening,
} from "./lib/job-openings-store.mjs";
import {
  createApplication,
  getApplicationById,
  getApplicationByPair,
  listApplicationsForOpening,
  listApplicationsForUser,
  updateApplication,
} from "./lib/applications-store.mjs";
import {
  createVerifiedHire,
  expireReviewWindow,
  getVerifiedHireById,
  getVerifiedHireByToken,
  listVerifiedHiresForUser,
  resolveEmployerAccount,
} from "./lib/verified-hires-store.mjs";
import { ReviewError } from "./lib/reviews.mjs";
import {
  aggregateRating,
  getReviewByVerifiedHireAndKind,
  listReviewsForTargetUser,
  submitApplicantReview,
  submitEmployerReview,
  submitReviewReply,
} from "./lib/reviews-store.mjs";
import {
  emitNotification,
  listNotificationsForUser,
  markAllReadForUser,
  markNotificationRead,
  unreadCountForUser,
} from "./lib/notifications-store.mjs";
import { isEmailConfigured } from "./lib/email-sender.mjs";
import { WithdrawalError } from "./lib/withdrawals.mjs";
import {
  maybeCreateReferralCommission,
  referralSummaryForUser,
  seedDevCommission,
} from "./lib/referrals-store.mjs";
import {
  adminUpdateWithdrawal,
  countPendingWithdrawals,
  createWithdrawalRequest,
  listWithdrawalsForAdmin,
  listWithdrawalsForUser,
} from "./lib/withdrawals-store.mjs";
import { listAuditLog, recordAdminAction } from "./lib/audit-log-store.mjs";
import {
  CommentError,
  MAX_COMMENT_LENGTH,
  canCommentToday,
  dailyCommentLimit,
  isCommentEditable,
  postAllowsComments,
} from "./lib/comments.mjs";
import {
  countCommentsForPosts,
  createComment,
  dailyCommentCountForAuthor,
  getCommentById,
  listCommentsForPost,
  softDeleteComment,
  updateCommentBody,
} from "./lib/comments-store.mjs";
import {
  countLikesForComments,
  countLikesForPosts,
  countSavesForPosts,
  getPostLike,
  getPostSave,
  likeComment,
  likePost,
  listLikedCommentIdsForUser,
  listSavedPostsForUser,
  savePost,
  unlikeComment,
  unlikePost,
  unsavePost,
} from "./lib/post-engagement-store.mjs";
import {
  countsForUser as followCountsForUser,
  follow as followUser,
  isFollowing as isFollowingUser,
  listFollowingForUser,
  unfollow as unfollowUser,
} from "./lib/follows-store.mjs";
import { TriggerBError, isEligibleToReview } from "./lib/trigger-b.mjs";
import {
  approveHeldReview,
  canReviewProfile,
  createReviewReport,
  listHeldReviews,
  listReportedReviews,
  rejectHeldReview,
  resolveReviewReport,
  submitTriggerBReview,
} from "./lib/trigger-b-store.mjs";
import {
  getFlag as getFeatureFlag,
  listFlags as listFeatureFlags,
  setFlag as setFeatureFlag,
  TRIGGER_B_FLAG,
} from "./lib/feature-flags-store.mjs";

const providers = [
  { id: "p1", username: "ada.codes", name: "Ada Okafor", status: "active", city: "Ikeja", country: "Nigeria", skills: ["React", "TypeScript", "UI Design"] },
  { id: "p2", username: "kemi.designs", name: "Kemi Adebayo", status: "active", city: "Lekki", country: "Nigeria", skills: ["Brand Design", "Figma"] },
  { id: "p3", username: "fixit.lagos", name: "FixIt Lagos", status: "active", city: "Surulere", country: "Nigeria", skills: ["AC Service", "Appliance Repair"] },
];

function getCorsOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return env.ALLOWED_ORIGINS[0] || "null";
  if (env.ALLOWED_ORIGINS.includes("*") || env.ALLOWED_ORIGINS.includes(origin)) return origin;
  return "null";
}

function sendJson(req, res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": getCorsOrigin(req),
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": `authorization,content-type,svix-id,svix-signature,svix-timestamp,x-nowpayments-sig,${CSRF_HEADER}`,
    "access-control-expose-headers": "x-ratelimit-limit,x-ratelimit-remaining,x-ratelimit-reset",
    "access-control-allow-credentials": "true",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "strict-transport-security": "max-age=63072000; includeSubDomains",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    // Phase 8-6 — strict CSP on JSON responses. Tight default-src 'none'
    // because nothing should be loaded from a JSON API response.
    "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
    vary: "Origin",
  };
  // Phase 8-5 — CSRF double-submit. On any safe-method response (GET / HEAD /
  // OPTIONS) seed the cookie if missing so the next mutation can match.
  const isSafe = req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS";
  if (isSafe && !readCookie(req, CSRF_COOKIE)) {
    const token = issueCsrfToken({ subject: clientIp(req) });
    headers["set-cookie"] = buildCsrfCookie(token, { secure: !isDev() });
  }
  res.writeHead(status, headers);
  res.end(body);
}

// Phase 8-4 — body-size caps. JSON / webhook / form bodies cap at 1 MB.
// Binary uploads (avatars, CV PDF) cap at 6 MB so the 5 MB PRD §3.1 limit
// plus form overhead fits without throwing on legitimate uploads.
export const BODY_LIMIT_JSON_BYTES = 1 * 1024 * 1024;
export const BODY_LIMIT_BINARY_BYTES = 6 * 1024 * 1024;

class PayloadTooLargeError extends Error {
  constructor(limitBytes) {
    super(`Payload too large (max ${limitBytes} bytes).`);
    this.status = 413;
    this.limitBytes = limitBytes;
  }
}

function rejectIfDeclaredOversize(req, limitBytes) {
  const declared = Number(req.headers["content-length"]);
  if (Number.isFinite(declared) && declared > limitBytes) {
    throw new PayloadTooLargeError(limitBytes);
  }
}

async function readBody(req, { limitBytes = BODY_LIMIT_JSON_BYTES } = {}) {
  if (typeof req._rawBody === "string") return req._rawBody;
  rejectIfDeclaredOversize(req, limitBytes);
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > limitBytes) {
      req.destroy();
      throw new PayloadTooLargeError(limitBytes);
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function readBytes(req, { limitBytes = BODY_LIMIT_BINARY_BYTES } = {}) {
  rejectIfDeclaredOversize(req, limitBytes);
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > limitBytes) {
      req.destroy();
      throw new PayloadTooLargeError(limitBytes);
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function parseJsonBody(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function requireSession(req) {
  return verifyClerkSession(req);
}

async function requireActiveUser(req, { moduleName } = {}) {
  const session = await requireSession(req);
  const user = await findUserById(session.userId);
  if (!user) throw new HttpError(404, "User profile not found.");
  if (user.status === "banned") throw new HttpError(403, "Account is suspended.");
  if (user.status !== "active") throw new HttpError(403, "Activate your account to interact.");
  if (moduleName && isModuleRestricted(user, moduleName)) {
    throw new HttpError(403, `${moduleName} restricted by admin.`);
  }
  return { session, user };
}

async function requireAdmin(req) {
  const session = await verifyClerkSession(req);
  if (!isAdminEmail(session.email)) {
    throw new AuthError(403, "Not authorized.");
  }
  return session;
}

// withAdminAudit wraps any admin handler. It:
//   1) Calls the handler.
//   2) On success, writes an audit row with `actionName`, the URL params (as
//      target_id when present), the URL path/method, and a slim metadata bag
//      built by `buildMetadata(body)` if provided.
//   3) On error (any throw), writes an audit row with status='error' and the
//      message, then re-throws so the existing error handling fires.
// The wrapper expects the wrapped function to already call requireAdmin so
// the session is verified before we touch the database; we capture the
// session by also doing requireAdmin here (cheap; same session token).
function withAdminAudit(actionName, fn, { targetType = null, buildMetadata = null } = {}) {
  return async (req, res, url, params) => {
    let session = null;
    try {
      session = await requireAdmin(req);
    } catch (err) {
      // Don't audit unauthorized attempts; the gate already returns 401/403.
      throw err;
    }

    // Tee the body so the handler can re-parse it and so we can include a
    // summary in audit metadata. We read the body once here and stash it on
    // req for the handler to reuse via parseJsonBody(req._rawBody).
    let rawBody = "";
    if (req.method !== "GET") {
      rawBody = await readBody(req);
      req._rawBody = rawBody;
    }

    const baseMeta = {
      params: params || {},
      body: rawBody ? safeMetaParse(rawBody) : null,
    };
    let extraMeta = {};
    if (typeof buildMetadata === "function") {
      try { extraMeta = buildMetadata(baseMeta.body, params) || {}; } catch {}
    }
    const metadata = { ...baseMeta, ...extraMeta };

    try {
      await fn(req, res, url, params);
      await recordAdminAction({
        actorEmail: session?.email || null,
        actorUserId: session?.userId || null,
        action: actionName,
        targetType,
        targetId: params?.id || params?.userId || params?.token || null,
        metadata,
        requestMethod: req.method,
        requestPath: url?.pathname || req.url || null,
        status: "ok",
      });
    } catch (err) {
      await recordAdminAction({
        actorEmail: session?.email || null,
        actorUserId: session?.userId || null,
        action: actionName,
        targetType,
        targetId: params?.id || params?.userId || params?.token || null,
        metadata,
        requestMethod: req.method,
        requestPath: url?.pathname || req.url || null,
        status: "error",
        errorMessage: err?.message?.slice(0, 500) || String(err).slice(0, 500),
      });
      throw err;
    }
  };
}

function safeMetaParse(raw) {
  try {
    const parsed = JSON.parse(raw);
    // Strip anything secret-looking before persisting (tokens, etc.)
    return scrubSecrets(parsed);
  } catch {
    return null;
  }
}

function scrubSecrets(obj, depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 5) return obj;
  if (Array.isArray(obj)) return obj.map((v) => scrubSecrets(v, depth + 1));
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (/token|secret|password|totp/i.test(k)) {
      out[k] = "[redacted]";
    } else {
      out[k] = scrubSecrets(v, depth + 1);
    }
  }
  return out;
}

async function optionalSession(req) {
  try {
    return await verifyClerkSession(req);
  } catch (err) {
    if (err instanceof AuthError && (err.status === 401 || err.status === 500)) {
      return null;
    }
    throw err;
  }
}

function handleAuthError(req, res, err) {
  if (err instanceof AuthError) {
    sendJson(req, res, err.status, { error: err.message });
    return true;
  }
  if (err instanceof SubscriptionEligibilityError) {
    sendJson(req, res, err.status, { error: err.message, code: err.code });
    return true;
  }
  if (err instanceof ModerationError) {
    sendJson(req, res, err.status, { error: err.message });
    return true;
  }
  if (err instanceof HireRequestValidationError) {
    sendJson(req, res, err.status, { error: err.message });
    return true;
  }
  if (err instanceof OtpError) {
    sendJson(req, res, err.status, { error: err.message, field: err.field });
    return true;
  }
  if (err instanceof ReviewError) {
    sendJson(req, res, err.status, { error: err.message });
    return true;
  }
  if (err instanceof WithdrawalError) {
    sendJson(req, res, err.status, { error: err.message, code: err.code });
    return true;
  }
  if (err instanceof CommentError) {
    sendJson(req, res, err.status, { error: err.message, code: err.code });
    return true;
  }
  if (err instanceof HttpError) {
    sendJson(req, res, err.status, { error: err.message, code: err.code });
    return true;
  }
  if (err && err.status === 413 && typeof err.limitBytes === "number") {
    sendJson(req, res, 413, { error: err.message, limitBytes: err.limitBytes });
    return true;
  }
  return false;
}

function wrap(fn) {
  return async (req, res, ...rest) => {
    try {
      await fn(req, res, ...rest);
    } catch (err) {
      if (!handleAuthError(req, res, err)) throw err;
    }
  };
}

async function handleAuthMe(req, res) {
  const session = await requireSession(req);
  let user = await findUserById(session.userId);
  if (!user) {
    const clerkUser = await fetchClerkUser(session.userId);
    user = await upsertUserFromClerk(clerkUser, {
      referredBy: clerkUser.unsafeMetadata?.referredBy
        || clerkUser.unsafe_metadata?.referredBy
        || null,
      accountType: clerkUser.unsafeMetadata?.accountType
        || clerkUser.unsafe_metadata?.accountType
        || "Individual",
    });
  }
  const subscription = await getLatestSubscription(session.userId);
  sendJson(req, res, 200, { data: publicUserShape(user, subscription) });
}

async function handleSubscriptionsStatus(req, res) {
  const session = await requireSession(req);
  const subscription = await getLatestSubscription(session.userId);
  if (!subscription) {
    sendJson(req, res, 200, { data: { status: "none" } });
    return;
  }
  sendJson(req, res, 200, {
    data: {
      status: subscription.status,
      plan: subscription.plan,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      trialEndAt: subscription.trial_end_at,
    },
  });
}

async function handleSubscriptionsInitiate(req, res) {
  const session = await requireSession(req);
  const body = parseJsonBody(await readBody(req));
  const planCode = String(body.plan || "").trim();
  const plan = getPlan(planCode);
  await assertEligibleToSubscribe({ userId: session.userId, planCode });

  const orderId = buildOrderId("u", [session.userId, planCode]);
  const invoice = await createInvoice({
    priceAmount: plan.priceUsd,
    orderId,
    orderDescription: `Needool ${plan.tier} ${plan.cycle} subscription`,
  });
  sendJson(req, res, 201, {
    data: {
      invoiceUrl: invoice.invoice_url || invoice.invoiceUrl || null,
      invoiceId: invoice.id || invoice.invoice_id || null,
      orderId,
      plan: planCode,
    },
  });
}

// Hire-quote-prefix ("h") handler: parts = [hireRequestId]
registerOrderHandler("h", async (payload, parts) => {
  const [hireRequestId] = parts;
  if (!hireRequestId) return { applied: false, reason: "missing_hire_request_id" };
  const hireRequest = await getHireRequestById(hireRequestId);
  if (!hireRequest) return { applied: false, reason: "unknown_hire_request" };
  if (hireRequest.status === "paid" || hireRequest.status === "promoted") {
    return { applied: false, reason: "idempotent_replay" };
  }
  await markHireRequestPaid({ id: hireRequestId, paidAt: new Date().toISOString() });
  const draft = await createJobOpening({
    hire_request_id: hireRequestId,
    title: hireRequest.role_title,
    eligible_account_type: hireRequest.account_type_pref || "Both",
    employment_type:
      hireRequest.employment_type === "remote"
        ? "Remote"
        : hireRequest.employment_type === "onsite"
          ? "OnSite"
          : "Hybrid",
    description: hireRequest.job_description || "",
    application_instructions: "Tell us briefly why this role fits you.",
    status: "draft",
  });
  await promoteHireRequest({ id: hireRequestId, jobOpeningId: draft.id });
  return { applied: true, jobOpeningId: draft.id };
});

// Subscription-prefix ("u") handler: parts = [userId, planCode]
registerOrderHandler("u", async (payload, parts) => {
  const [parsedUserId, planCode] = parts;
  if (!parsedUserId || !planCode || !PLAN_CATALOG[planCode]) {
    return { applied: false, reason: "missing_metadata" };
  }
  const user = await findUserById(parsedUserId);
  if (!user) return { applied: false, reason: "unknown_user" };

  const providerPaymentId = String(payload.payment_id ?? payload.id ?? "");
  const existingSub = await getLatestSubscription(parsedUserId);
  if (existingSub && existingSub.provider_payment_id === providerPaymentId) {
    const commission = await maybeCreateReferralCommission({
      referee: user,
      providerPaymentId,
      priceAmount: payload.price_amount ?? PLAN_CATALOG[planCode].priceUsd,
    });
    return { applied: false, reason: "idempotent_replay", commission };
  }
  const hasTrial = Boolean(user.referred_by) && !existingSub;
  await activateOrExtendSubscription({
    userId: parsedUserId,
    planCode,
    hasTrial,
    providerPaymentId,
  });
  const commission = await maybeCreateReferralCommission({
    referee: user,
    providerPaymentId,
    priceAmount: payload.price_amount ?? PLAN_CATALOG[planCode].priceUsd,
  });
  return { applied: true, commission };
});

async function processNowpaymentsPayload(payload) {
  const providerPaymentId = String(payload.payment_id ?? payload.id ?? "");
  if (!providerPaymentId) throw new Error("Missing payment_id in webhook payload.");
  const orderId = payload.order_id || null;
  const parsed = orderId ? parseOrderId(orderId) : null;
  const status = payload.payment_status || payload.status || "unknown";

  // Determine an optional user_id to attach to the payment row (for u. prefix).
  let userIdForPayment = null;
  if (parsed?.prefix === "u" && parsed.parts[0]) {
    const found = await findUserById(parsed.parts[0]);
    if (found) userIdForPayment = found.id;
  }

  await recordPayment({
    userId: userIdForPayment,
    provider: "nowpayments",
    providerPaymentId,
    orderId,
    priceAmount: payload.price_amount ?? null,
    priceCurrency: payload.price_currency ?? null,
    payAmount: payload.pay_amount ?? null,
    payCurrency: payload.pay_currency ?? null,
    status,
    rawPayload: payload,
  });

  if (status !== SUCCESS_STATUS) {
    return { applied: false, reason: "non_terminal", status };
  }
  if (!parsed) return { applied: false, reason: "unparseable_order_id" };
  const handler = resolveOrderHandler(parsed.prefix);
  if (!handler) return { applied: false, reason: "unknown_prefix", prefix: parsed.prefix };

  // Webhook-level idempotency: if we already saw this payment, don't re-run the handler.
  const seen = await getPaymentById("nowpayments", providerPaymentId);
  if (seen && seen.status === SUCCESS_STATUS) {
    // The payment row existed AND already finished — the upsert above didn't change anything.
    // Still call the handler — its own idempotency check decides what to do.
  }
  return handler(payload, parsed.parts);
}

async function handleNowpaymentsWebhook(req, res) {
  const raw = await readBody(req);
  const signature = req.headers["x-nowpayments-sig"];
  if (!verifyIpnSignature(raw, signature)) {
    sendJson(req, res, 400, { error: "Invalid signature." });
    return;
  }
  const payload = parseJsonBody(raw);
  const result = await processNowpaymentsPayload(payload);
  sendJson(req, res, 200, { ok: true, ...result });
}

async function handleClerkWebhook(req, res) {
  const raw = await readBody(req);
  let event;
  try {
    event = verifyClerkWebhook(raw, req.headers);
  } catch (err) {
    sendJson(req, res, 400, { error: `Invalid Clerk webhook signature: ${err.message}` });
    return;
  }
  const type = event.type;
  const data = event.data;
  if (type === "user.created" || type === "user.updated") {
    const meta = data.unsafe_metadata || data.unsafeMetadata || {};
    const accountType = meta.accountType === "Business" ? "Business" : "Individual";
    // PRD §2.3 + §2.4 — validate at the boundary; pickIndividualSignup throws
    // on missing required fields or under-18 DOB. If the form posted a
    // partial profile (legacy clients), fall back to a permissive parse so
    // the user.created event still lands a row.
    let individual = null;
    let business = null;
    try {
      if (accountType === "Individual") individual = pickIndividualSignup(meta);
      if (accountType === "Business") business = pickBusinessSignup(meta);
    } catch (e) {
      if (e instanceof SignupError) {
        // Log the validation problem but still create a minimal user row so
        // the auth flow can complete. The user can be force-updated later.
        console.warn(`[clerk-webhook] signup validation: ${e.message} (${e.field})`);
      } else {
        throw e;
      }
    }
    await upsertUserFromClerk(data, {
      referredBy: meta.referredBy || null,
      referredByCookie: meta.referredByCookie || null,
      accountType,
      individual,
      business,
    });
  } else if (type === "user.deleted") {
    await softDeleteUser(data.id);
  }
  sendJson(req, res, 200, { ok: true, handled: type });
}

async function handleDevSimulateWebhook(req, res) {
  if (!isDev()) {
    sendJson(req, res, 404, { error: "Not found" });
    return;
  }
  const body = parseJsonBody(await readBody(req));
  const result = await processNowpaymentsPayload({
    payment_id: body.payment_id || `dev_${Date.now()}`,
    payment_status: body.payment_status || SUCCESS_STATUS,
    order_id: body.order_id,
    price_amount: body.price_amount ?? null,
    price_currency: body.price_currency ?? "usd",
    pay_amount: body.pay_amount ?? null,
    pay_currency: body.pay_currency ?? "usdttrc20",
    simulated: true,
  });
  sendJson(req, res, 200, { ok: true, ...result });
}

// ---------------------------------------------------------------------------
// Referrals, wallet, withdrawals (Phase 3A)
// ---------------------------------------------------------------------------

async function handleReferralSummary(req, res) {
  const session = await requireSession(req);
  const withdrawals = await listWithdrawalsForUser(session.userId);
  const summary = await referralSummaryForUser(session.userId, { withdrawals });
  if (!summary) throw new HttpError(404, "User profile not found.");
  sendJson(req, res, 200, { data: summary, source: "supabase" });
}

async function handleReferralCommissions(req, res) {
  const session = await requireSession(req);
  const summary = await referralSummaryForUser(session.userId, {
    withdrawals: await listWithdrawalsForUser(session.userId),
  });
  if (!summary) throw new HttpError(404, "User profile not found.");
  sendJson(req, res, 200, { data: summary.commissions, source: "supabase" });
}

async function handleMyWithdrawals(req, res) {
  const session = await requireSession(req);
  const rows = await listWithdrawalsForUser(session.userId);
  sendJson(req, res, 200, { data: rows, source: "supabase" });
}

async function handleCreateWithdrawal(req, res) {
  const session = await requireSession(req);
  const body = parseJsonBody(await readBody(req));
  const created = await createWithdrawalRequest({
    userId: session.userId,
    amountUsdt: body.amountUsdt ?? body.amount_usdt ?? body.amount,
    trc20Address: body.trc20Address ?? body.trc20_address ?? body.address,
    totpCode: body.totpCode ?? body.totp_code ?? body.totp,
  });
  sendJson(req, res, 201, { data: created });
}

async function handleAdminWithdrawals(req, res, url) {
  await requireAdmin(req);
  const status = url.searchParams.get("status") || undefined;
  const limit = Math.min(Number(url.searchParams.get("limit") || 100), 200);
  const rows = await listWithdrawalsForAdmin({ status, limit });
  sendJson(req, res, 200, { data: rows, source: "supabase" });
}

async function handleAdminWithdrawalAction(req, res, _url, params) {
  const admin = await requireAdmin(req);
  const body = parseJsonBody(await readBody(req));
  const updated = await adminUpdateWithdrawal({
    id: params.id,
    adminId: admin.userId,
    action: String(body.action || "").trim(),
    txHash: body.txHash ?? body.tx_hash,
    reason: body.reason,
  });
  sendJson(req, res, 200, { data: updated });
}

async function handleDevSeedReferralCommission(req, res) {
  if (!isDev()) {
    sendJson(req, res, 404, { error: "Not found" });
    return;
  }
  const session = await requireSession(req);
  const body = parseJsonBody(await readBody(req));
  const amountUsdt = body.amountUsdt ?? body.amount_usdt ?? body.amount ?? 25;
  const row = await seedDevCommission({ referrerId: session.userId, amountUsdt });
  if (!row) throw new HttpError(404, "User profile not found.");
  sendJson(req, res, 201, { data: row });
}

// ---------------------------------------------------------------------------
// Posts (Need Requests / Opportunities / Events)
// ---------------------------------------------------------------------------

function pickPostInput(body) {
  return {
    kind: String(body.kind || "").trim(),
    title: String(body.title || "").trim(),
    description: String(body.description || "").trim(),
    thumbnailUrl: body.thumbnail_url || body.thumbnailUrl || null,
    scope: String(body.scope || "worldwide").trim(),
    scopeCountry: body.scope_country || body.scopeCountry || null,
    scopeState: body.scope_state || body.scopeState || null,
    scopeCity: body.scope_city || body.scopeCity || null,
    scopeLat: body.scope_lat ?? body.scopeLat ?? null,
    scopeLng: body.scope_lng ?? body.scopeLng ?? null,
    scopeRadiusKm: body.scope_radius_km ?? body.scopeRadiusKm ?? null,
    links: Array.isArray(body.links) ? body.links : [],
    payload: body.payload && typeof body.payload === "object" ? body.payload : {},
  };
}

function validatePostInput(input, { adminCreating = false } = {}) {
  if (!POST_KINDS.includes(input.kind)) {
    throw new HttpError(400, `kind must be one of ${POST_KINDS.join(", ")}.`);
  }
  if (input.kind === "event" && !adminCreating) {
    throw new HttpError(403, "Events can only be created by admin.");
  }
  if (!input.title) throw new HttpError(400, "title is required.");
  if (input.title.length > maxTitleLength(input.kind)) {
    throw new HttpError(400, `title is too long; max ${maxTitleLength(input.kind)} characters.`);
  }
  if (input.description.length > maxDescriptionLength(input.kind)) {
    throw new HttpError(400, `description is too long; max ${maxDescriptionLength(input.kind)} characters.`);
  }
  if (!POST_SCOPES.includes(input.scope)) {
    throw new HttpError(400, `scope must be one of ${POST_SCOPES.join(", ")}.`);
  }
  // PRD §6.1 — Opportunities don't allow 'Near me' radius scope.
  if (input.scope === "near" && input.kind !== "need") {
    throw new HttpError(400, "'near' scope only applies to need requests.");
  }
  // PRD §5.1 — thumbnail is compulsory. Admin event creation may waive
  // (some admin events surface from external sources). Users posting
  // needs/opportunities must supply one.
  if (!adminCreating && !input.thumbnailUrl) {
    throw new HttpError(400, "Thumbnail image is required (PRD §5.1).");
  }
  // PRD §5.1 — phones/emails are auto-rejected, not stripped. For Opps +
  // Events raw URLs are also rejected; for Needs we leave URLs to the
  // links array. (Spec is silent on URL allowance in Need descriptions.)
  if (containsContactInfo(input.title)) {
    throw new HttpError(400, "Title appears to contain a phone number or email (PRD §5.1).");
  }
  const checkUrlsInDescription = input.kind === "opportunity" || input.kind === "event";
  if (containsContactInfo(input.description, { checkUrls: checkUrlsInDescription })) {
    throw new HttpError(
      400,
      checkUrlsInDescription
        ? "Description appears to contain a phone, email, or raw URL (PRD §5.1)."
        : "Description appears to contain a phone or email (PRD §5.1).",
    );
  }
  // PRD §5.1 — at most 3 links.
  if (input.links.length > maxLinksAllowed()) {
    throw new HttpError(400, `at most ${maxLinksAllowed()} links allowed.`);
  }
  for (const link of input.links) {
    if (!link || typeof link !== "object") throw new HttpError(400, "links entries must be objects.");
    if (link.title && String(link.title).length > 20) {
      throw new HttpError(400, "each link title must be 20 chars or less.");
    }
  }
}

async function handleCreatePost(req, res) {
  const session = await requireSession(req);
  const author = await findUserById(session.userId);
  if (!author) throw new HttpError(404, "User profile not found.");
  if (author.status === "banned") throw new HttpError(403, "Account is suspended.");
  if (isModuleRestricted(author, "posting")) {
    throw new HttpError(403, "Posting restricted by admin.");
  }
  if (author.status !== "active") {
    throw new HttpError(403, "Activate your account to post.");
  }

  const input = pickPostInput(parseJsonBody(await readBody(req)));
  validatePostInput(input);

  const monthly = await monthlyPostCount(author.id, input.kind);
  if (!canCreatePostThisMonth({ accountType: author.account_type, kind: input.kind, monthlyCount: monthly })) {
    throw new HttpError(429, "Monthly post limit reached for this kind.");
  }

  const cleanTitle = stripContactInfo(input.title);
  const cleanDescription = stripContactInfo(input.description, {
    stripUrls: input.kind === "opportunity" || input.kind === "event",
  });

  const created = await createPost({
    authorId: author.id,
    kind: input.kind,
    title: cleanTitle,
    description: cleanDescription,
    thumbnailUrl: input.thumbnailUrl,
    scope: input.scope,
    scopeCountry: input.scopeCountry,
    scopeState: input.scopeState,
    scopeCity: input.scopeCity,
    scopeLat: input.scopeLat,
    scopeLng: input.scopeLng,
    scopeRadiusKm: input.scopeRadiusKm,
    links: input.links,
    payload: input.payload,
    status: "pending",
  });

  sendJson(req, res, 201, { data: publicPostShape(created, { viewerIsAuthor: true, viewerSignedIn: true }) });
}

async function enrichPostsWithEngagement(posts, session) {
  if (!Array.isArray(posts) || posts.length === 0) return new Map();
  const ids = posts.map((p) => p.id);
  const [likeCounts, saveCounts, commentCounts] = await Promise.all([
    countLikesForPosts(ids),
    countSavesForPosts(ids),
    countCommentsForPosts(ids),
  ]);
  let myLikes = new Set();
  let mySaves = new Set();
  if (session) {
    // Cheap per-id lookups; small N (≤100 per request).
    await Promise.all(
      ids.map(async (id) => {
        const [like, save] = await Promise.all([
          getPostLike({ postId: id, userId: session.userId }),
          getPostSave({ postId: id, userId: session.userId }),
        ]);
        if (like) myLikes.add(id);
        if (save) mySaves.add(id);
      }),
    );
  }
  const map = new Map();
  for (const p of posts) {
    map.set(p.id, {
      likeCount: likeCounts[p.id] || 0,
      saveCount: saveCounts[p.id] || 0,
      commentCount: commentCounts[p.id] || 0,
      isLiked: myLikes.has(p.id),
      isSaved: mySaves.has(p.id),
    });
  }
  return map;
}

async function handleListPosts(req, res, url) {
  const session = await optionalSession(req);
  const params = url.searchParams;
  const kind = params.get("kind");
  if (kind && !POST_KINDS.includes(kind)) {
    throw new HttpError(400, `kind must be one of ${POST_KINDS.join(", ")}.`);
  }
  const rows = await listPosts({
    status: "approved",
    kind: kind || undefined,
    scopeCountry: params.get("country") || undefined,
    scopeState: params.get("state") || undefined,
    scopeCity: params.get("city") || undefined,
    limit: Math.min(Number(params.get("limit") || 50), 100),
  });

  const visible = rows.filter((row) => !(!session && row.kind === "opportunity"));
  const engagement = await enrichPostsWithEngagement(visible, session);

  const data = visible.map((row) => {
    const eng = engagement.get(row.id) || {};
    if (!session) return { ...visitorPostSummary(row), ...eng };
    return { ...publicPostShape(row, {
      viewerIsAuthor: session?.userId === row.author_id,
      viewerSignedIn: true,
    }), ...eng };
  });

  sendJson(req, res, 200, { data, source: "supabase" });
}

async function handleGetPost(req, res, _url, params) {
  const session = await optionalSession(req);
  const row = await getPost(params.id);
  if (!row) {
    sendJson(req, res, 404, { error: "Post not found." });
    return;
  }
  if (row.status !== "approved" && !(session && session.userId === row.author_id)) {
    // hide non-approved from non-authors
    sendJson(req, res, 404, { error: "Post not found." });
    return;
  }
  const engagement = (await enrichPostsWithEngagement([row], session)).get(row.id) || {};
  if (!session) {
    const visibility = visibleToVisitor(row.kind);
    if (visibility === "none") {
      sendJson(req, res, 401, { error: "Sign in to view this post." });
      return;
    }
    sendJson(req, res, 200, { data: { ...visitorPostSummary(row), ...engagement } });
    return;
  }
  const viewer = await findUserById(session.userId);
  sendJson(req, res, 200, {
    data: {
      ...publicPostShape(row, {
        viewerIsAuthor: session.userId === row.author_id,
        viewerSignedIn: viewer?.status === "active" && !isModuleRestricted(viewer, "commenting"),
      }),
      ...engagement,
    },
  });
}

async function handleClosePost(req, res, _url, params) {
  const session = await requireSession(req);
  const post = await getPost(params.id);
  if (!post) throw new HttpError(404, "Post not found.");
  if (post.author_id !== session.userId) throw new HttpError(403, "Only the author can close this post.");
  const closed = await closePost(post.id);
  sendJson(req, res, 200, { data: publicPostShape(closed, { viewerIsAuthor: true, viewerSignedIn: true }) });
}

async function handleMyPosts(req, res) {
  const session = await requireSession(req);
  const rows = await listMyPosts(session.userId);
  sendJson(req, res, 200, { data: rows.map((r) => publicPostShape(r, { viewerIsAuthor: true, viewerSignedIn: true })) });
}

// Admin moderation -----------------------------------------------------------

async function handleAdminPostsList(req, res, url) {
  await requireAdmin(req);
  const params = url.searchParams;
  const status = params.get("status") || "pending";
  const kind = params.get("kind");
  if (!["pending", "approved", "rejected", "closed"].includes(status)) {
    throw new HttpError(400, "status must be pending|approved|rejected|closed.");
  }
  if (kind && !POST_KINDS.includes(kind)) {
    throw new HttpError(400, `kind must be one of ${POST_KINDS.join(", ")}.`);
  }
  const rows = await listPostsForAdmin({
    status,
    kind: kind || undefined,
    limit: Math.min(Number(params.get("limit") || 100), 200),
  });
  sendJson(req, res, 200, { data: rows, source: "supabase" });
}

async function handleAdminPostAction(req, res, _url, params) {
  const admin = await requireAdmin(req);
  const body = parseJsonBody(await readBody(req));
  const action = String(body.action || "").trim();
  const reason = body.reason ? String(body.reason).trim() : null;

  const post = await getPost(params.id);
  if (!post) throw new HttpError(404, "Post not found.");

  let updated = post;
  if (action === "approve") {
    updated = await approvePost(post.id, admin.userId);
  } else if (action === "reject") {
    updated = await rejectPost(post.id, admin.userId, reason);
  } else if (action === "pin") {
    updated = await pinPost(post.id, admin.userId);
  } else if (action === "unpin") {
    updated = await unpinPost(post.id, admin.userId);
  } else {
    throw new HttpError(400, "action must be approve|reject|pin|unpin.");
  }

  sendJson(req, res, 200, { data: updated });
}

async function handleAdminCreatePost(req, res) {
  const admin = await requireAdmin(req);
  const body = parseJsonBody(await readBody(req));
  const input = pickPostInput(body);
  if (!input.kind) input.kind = "event";
  validatePostInput(input, { adminCreating: true });

  const cleanTitle = stripContactInfo(input.title);
  const cleanDescription = stripContactInfo(input.description, {
    stripUrls: input.kind === "opportunity" || input.kind === "event",
  });

  const adminUser = await findUserById(admin.userId);

  const created = await createPost({
    authorId: adminUser?.id ?? null,
    kind: input.kind,
    title: cleanTitle,
    description: cleanDescription,
    thumbnailUrl: input.thumbnailUrl,
    scope: input.scope,
    scopeCountry: input.scopeCountry,
    scopeState: input.scopeState,
    scopeCity: input.scopeCity,
    scopeLat: input.scopeLat,
    scopeLng: input.scopeLng,
    scopeRadiusKm: input.scopeRadiusKm,
    links: input.links,
    payload: input.payload,
    status: "approved",
  });
  sendJson(req, res, 201, { data: created });
}

async function handleAdminUsersList(req, res, url) {
  await requireAdmin(req);
  const params = url.searchParams;
  const rows = await listUsersForAdmin({
    q: params.get("q") || undefined,
    status: params.get("status") || undefined,
    limit: Math.min(Number(params.get("limit") || 100), 200),
  });
  sendJson(req, res, 200, {
    data: rows.map((row) => publicUserShape(row)),
    source: "supabase",
  });
}

async function handleAdminUserAction(req, res, _url, params) {
  await requireAdmin(req);
  const body = parseJsonBody(await readBody(req));
  const action = String(body.action || "").trim();
  const reason = body.reason ? String(body.reason).trim() : null;
  let updated;
  if (action === "ban") {
    updated = await banUser(params.id, { reason });
  } else if (action === "unban") {
    updated = await unbanUser(params.id);
  } else if (action === "restrict") {
    const modules = Array.isArray(body.modules) ? body.modules : [];
    updated = await restrictUser(params.id, { modules, reason });
  } else if (action === "unrestrict") {
    updated = await unrestrictUser(params.id);
  } else {
    throw new HttpError(
      400,
      `action must be ban|unban|restrict|unrestrict. Allowed modules: ${ALLOWED_MODULES.join(", ")}.`,
    );
  }
  sendJson(req, res, 200, { data: publicUserShape(updated) });
}

async function handleAdminAuditLog(req, res, url) {
  await requireAdmin(req);
  const params = url.searchParams;
  const rows = await listAuditLog({
    action: params.get("action") || undefined,
    actor: params.get("actor") || undefined,
    targetType: params.get("target_type") || undefined,
    targetId: params.get("target_id") || undefined,
    limit: params.get("limit") || undefined,
  });
  sendJson(req, res, 200, { data: rows, source: "supabase" });
}

async function handleAdminOverview(req, res) {
  await requireAdmin(req);
  const [usersRows, subs, payments, pendingPostsCount, withdrawalsPending] = await Promise.all([
    selectMany("users", "select=id,status,account_type,created_at"),
    selectMany("subscriptions", "select=status,current_period_end"),
    selectMany("payments", "select=price_amount,status,created_at"),
    countByStatus("pending"),
    countPendingWithdrawals(),
  ]);

  const now = Date.now();
  const activeSubs = subs.filter(
    (s) => s.status === "active" && new Date(s.current_period_end).getTime() > now,
  );
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const revenueMtd = payments
    .filter((p) => p.status === "finished" && new Date(p.created_at) >= monthStart)
    .reduce((sum, p) => sum + Number(p.price_amount || 0), 0);

  const individualCount = usersRows.filter((u) => u.account_type === "Individual").length;
  const businessCount = usersRows.filter((u) => u.account_type === "Business").length;
  const bannedCount = usersRows.filter((u) => u.status === "banned").length;
  const restrictedCount = usersRows.filter((u) => u.status === "restricted").length;

  sendJson(req, res, 200, {
    data: {
      users: usersRows.length,
      activeSubscribers: activeSubs.length,
      individualCount,
      businessCount,
      bannedCount,
      restrictedCount,
      pendingApprovals: pendingPostsCount,
      revenueMtd,
      withdrawalsPending,
      triggerBEnabled: await getFeatureFlag(TRIGGER_B_FLAG, { fallback: false }),
    },
    source: "supabase",
  });
}

// Public feeds (kind-specific aliases) --------------------------------------

async function handleFeed(req, res, url, kind) {
  url.searchParams.set("kind", kind);
  await handleListPosts(req, res, url);
}

// ---------------------------------------------------------------------------
// Phase 4F — comments, likes, saves, follows
// ---------------------------------------------------------------------------

async function handleListComments(req, res, _url, params) {
  const post = await getPost(params.id);
  if (!post || post.status !== "approved") {
    sendJson(req, res, 404, { error: "Post not found." });
    return;
  }
  const session = await optionalSession(req);
  const rows = await listCommentsForPost(post.id);
  const ids = rows.map((r) => r.id);
  const likeCounts = await countLikesForComments(ids);
  const myLiked = session
    ? await listLikedCommentIdsForUser({ userId: session.userId, commentIds: ids })
    : new Set();

  // Decorate with author display + counts. Hydrate author info from users.
  const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));
  const authorsById = {};
  await Promise.all(
    authorIds.map(async (id) => {
      const u = await findUserById(id);
      if (u) authorsById[id] = { id: u.id, username: u.username, name: u.name, avatar: u.avatar };
    }),
  );

  const data = rows.map((r) => ({
    id: r.id,
    post_id: r.post_id,
    parent_comment_id: r.parent_comment_id,
    body: r.body,
    created_at: r.created_at,
    updated_at: r.updated_at,
    author: authorsById[r.author_id] || { id: r.author_id, username: null, name: null, avatar: null },
    likeCount: likeCounts[r.id] || 0,
    isLiked: myLiked.has(r.id),
    isAuthor: session?.userId === r.author_id,
    editable: session?.userId === r.author_id && isCommentEditable(r),
  }));
  sendJson(req, res, 200, { data });
}

async function handleCreateComment(req, res, _url, params) {
  const session = await requireSession(req);
  const author = await findUserById(session.userId);
  if (!author) throw new HttpError(404, "User profile not found.");
  if (author.status === "banned") throw new CommentError(403, "Account is suspended.");
  if (isModuleRestricted(author, "commenting")) {
    throw new CommentError(403, "Commenting restricted by admin.");
  }
  if (author.status !== "active") {
    throw new CommentError(403, "Activate your account to comment.");
  }
  const post = await getPost(params.id);
  if (!post || post.status !== "approved") throw new CommentError(404, "Post not found.");
  if (!postAllowsComments(post)) {
    throw new CommentError(400, "Comments are not allowed on this post.", "no_comments_allowed");
  }

  const body = parseJsonBody(await readBody(req));
  const text = String(body.body || "").trim();
  if (!text) throw new CommentError(400, "body is required.");
  if (text.length > MAX_COMMENT_LENGTH) {
    throw new CommentError(400, `body too long; max ${MAX_COMMENT_LENGTH} characters.`);
  }

  const todayCount = await dailyCommentCountForAuthor(author.id);
  if (!canCommentToday({ accountType: author.account_type, todayCount })) {
    throw new CommentError(
      429,
      `Daily comment limit reached (${dailyCommentLimit(author.account_type)}). Resets 00:00 GMT.`,
      "daily_limit",
    );
  }

  let parentCommentId = null;
  let parentComment = null;
  if (body.parent_comment_id || body.parentCommentId) {
    const pid = String(body.parent_comment_id || body.parentCommentId);
    parentComment = await getCommentById(pid);
    if (!parentComment || parentComment.deleted_at) {
      throw new CommentError(404, "Parent comment not found.");
    }
    if (parentComment.post_id !== post.id) {
      throw new CommentError(400, "Parent comment does not belong to this post.");
    }
    parentCommentId = parentComment.id;
  }

  const cleanBody = stripContactInfo(text);
  const created = await createComment({
    postId: post.id,
    authorId: author.id,
    parentCommentId,
    body: cleanBody,
  });

  // Notification fan-out
  if (parentComment && parentComment.author_id !== author.id) {
    await emitNotification({
      userId: parentComment.author_id,
      eventType: "reply_received",
      payload: {
        postId: post.id,
        commentId: created.id,
        parentCommentId: parentComment.id,
      },
    });
  } else if (post.author_id && post.author_id !== author.id) {
    await emitNotification({
      userId: post.author_id,
      eventType: "comment_received",
      payload: {
        postId: post.id,
        commentId: created.id,
      },
    });
  }

  sendJson(req, res, 201, { data: created });
}

async function handleEditComment(req, res, _url, params) {
  const session = await requireSession(req);
  const comment = await getCommentById(params.id);
  if (!comment || comment.deleted_at) throw new CommentError(404, "Comment not found.");
  if (comment.author_id !== session.userId) throw new CommentError(403, "Only the author can edit.");
  if (!isCommentEditable(comment)) {
    throw new CommentError(403, "Edit window closed (60 minutes).", "edit_window_closed");
  }
  const body = parseJsonBody(await readBody(req));
  const text = String(body.body || "").trim();
  if (!text) throw new CommentError(400, "body is required.");
  if (text.length > MAX_COMMENT_LENGTH) {
    throw new CommentError(400, `body too long; max ${MAX_COMMENT_LENGTH} characters.`);
  }
  const updated = await updateCommentBody({ id: comment.id, body: stripContactInfo(text) });
  sendJson(req, res, 200, { data: updated });
}

async function handleDeleteComment(req, res, _url, params) {
  const session = await requireSession(req);
  const comment = await getCommentById(params.id);
  if (!comment || comment.deleted_at) {
    sendJson(req, res, 204, {});
    return;
  }
  const isAdmin = isAdminEmail(session.email);
  if (comment.author_id !== session.userId && !isAdmin) {
    throw new CommentError(403, "Not authorized to delete this comment.");
  }
  await softDeleteComment(comment.id);
  sendJson(req, res, 200, { data: { id: comment.id, deleted: true } });
}

// Likes / saves --------------------------------------------------------------

async function handleLikePost(req, res, _url, params) {
  const { session } = await requireActiveUser(req);
  const post = await getPost(params.id);
  if (!post) throw new HttpError(404, "Post not found.");
  // PRD §5.5 — closed posts disable comments/likes/saves.
  if (post.status === "closed" || post.closed_at) {
    throw new HttpError(409, "Post is closed; likes are disabled.");
  }
  if (post.status !== "approved") throw new HttpError(404, "Post not found.");
  const result = await likePost({ postId: post.id, userId: session.userId });
  // First-like-only notification (idempotent via the unique constraint above)
  if (result.created && post.author_id && post.author_id !== session.userId) {
    await emitNotification({
      userId: post.author_id,
      eventType: "like_received",
      payload: { postId: post.id, likerId: session.userId },
    });
  }
  const count = (await countLikesForPosts([post.id]))[post.id] || 0;
  sendJson(req, res, 200, { data: { liked: true, likeCount: count } });
}

async function handleUnlikePost(req, res, _url, params) {
  const session = await requireSession(req);
  await unlikePost({ postId: params.id, userId: session.userId });
  const count = (await countLikesForPosts([params.id]))[params.id] || 0;
  sendJson(req, res, 200, { data: { liked: false, likeCount: count } });
}

async function handleSavePost(req, res, _url, params) {
  const { session } = await requireActiveUser(req);
  const post = await getPost(params.id);
  if (!post) throw new HttpError(404, "Post not found.");
  // PRD §5.5 — closed posts disable saves.
  if (post.status === "closed" || post.closed_at) {
    throw new HttpError(409, "Post is closed; saves are disabled.");
  }
  if (post.status !== "approved") throw new HttpError(404, "Post not found.");
  await savePost({ postId: post.id, userId: session.userId });
  sendJson(req, res, 200, { data: { saved: true } });
}

async function handleUnsavePost(req, res, _url, params) {
  const session = await requireSession(req);
  await unsavePost({ postId: params.id, userId: session.userId });
  sendJson(req, res, 200, { data: { saved: false } });
}

async function handleLikeComment(req, res, _url, params) {
  const { session } = await requireActiveUser(req, { moduleName: "commenting" });
  const comment = await getCommentById(params.id);
  if (!comment || comment.deleted_at) throw new CommentError(404, "Comment not found.");
  const post = await getPost(comment.post_id);
  if (!post || post.status !== "approved") throw new CommentError(404, "Post not found.");
  const result = await likeComment({ commentId: comment.id, userId: session.userId });
  if (result.created && comment.author_id !== session.userId) {
    await emitNotification({
      userId: comment.author_id,
      eventType: "like_received",
      payload: { commentId: comment.id, postId: comment.post_id, likerId: session.userId },
    });
  }
  const count = (await countLikesForComments([comment.id]))[comment.id] || 0;
  sendJson(req, res, 200, { data: { liked: true, likeCount: count } });
}

async function handleUnlikeComment(req, res, _url, params) {
  const session = await requireSession(req);
  await unlikeComment({ commentId: params.id, userId: session.userId });
  const count = (await countLikesForComments([params.id]))[params.id] || 0;
  sendJson(req, res, 200, { data: { liked: false, likeCount: count } });
}

async function handleMySaves(req, res) {
  const session = await requireSession(req);
  const rows = await listSavedPostsForUser(session.userId, { limit: 100 });
  // Hydrate posts via getPost (small N).
  const items = await Promise.all(
    rows.map(async (s) => {
      const post = await getPost(s.post_id);
      return post && post.status === "approved" ? { saved_at: s.created_at, post } : null;
    }),
  );
  sendJson(req, res, 200, { data: items.filter(Boolean) });
}

// Follows --------------------------------------------------------------------

async function handleFollowUser(req, res, _url, params) {
  const { session } = await requireActiveUser(req);
  const followee = await findUserById(params.id);
  if (!followee) throw new HttpError(404, "User not found.");
  if (followee.id === session.userId) throw new HttpError(400, "Cannot follow yourself.");
  const result = await followUser({ followerId: session.userId, followeeId: followee.id });
  if (result.created) {
    await emitNotification({
      userId: followee.id,
      eventType: "new_follower",
      payload: { followerId: session.userId },
    });
  }
  const counts = await followCountsForUser(followee.id);
  sendJson(req, res, 200, { data: { following: true, followers: counts.followers } });
}

async function handleUnfollowUser(req, res, _url, params) {
  const session = await requireSession(req);
  await unfollowUser({ followerId: session.userId, followeeId: params.id });
  const counts = await followCountsForUser(params.id);
  sendJson(req, res, 200, { data: { following: false, followers: counts.followers } });
}

async function handleMyFollows(req, res) {
  const session = await requireSession(req);
  const rows = await listFollowingForUser(session.userId, { limit: 100 });
  const items = await Promise.all(
    rows.map(async (r) => {
      const u = await findUserById(r.followee_id);
      return u
        ? { followed_at: r.created_at, user: { id: u.id, username: u.username, name: u.name, avatar: u.avatar } }
        : null;
    }),
  );
  sendJson(req, res, 200, { data: items.filter(Boolean) });
}

// Profile lookups for the public profile page -------------------------------

// PRD §3.2 — full public profile view. Contact details (phone, WhatsApp,
// links, CV) are revealed only when the profile is Active. Inactive returns
// nulls + a `notifyWhenActiveAvailable` flag the frontend uses to render
// the §3.3 "Notify when active" button.
async function handleUserByUsername(req, res, _url, params) {
  const user = await findUserByUsername(params.username);
  if (!user) {
    sendJson(req, res, 404, { error: "User not found." });
    return;
  }
  const session = await optionalSession(req);
  const isActive = user.status === "active";
  const isSelf = session?.userId === user.id;

  const [counts, links, skills, posts, reviews] = await Promise.all([
    followCountsForUser(user.id),
    listLinks(user.id),
    listSkills(user.id),
    listPosts({ authorId: user.id, status: "approved", limit: 50, pinnedFirst: true }),
    listReviewsForTargetUser(user.id),
  ]);
  const visiblePosts = posts.filter((p) => !p.closed_at);

  const isFollowing = session
    ? await isFollowingUser({ followerId: session.userId, followeeId: user.id })
    : false;

  // PRD §3.2 — picture, business address (Business only), distance to viewer.
  const avatarUrl = user.profile_picture_path
    ? publicUrl({ bucket: "avatars", path: user.profile_picture_path })
    : user.avatar;

  // Distance: only reveal if both viewer + profile have lat/lng. Viewer
  // location comes from optional `viewerLat` / `viewerLng` query params so
  // the SSR cache key stays stable. PRD §3.1 says "never shown precisely".
  let distanceKm = null;
  const viewerLat = parseFloat(req.url?.match(/[?&]viewerLat=([^&]+)/)?.[1] ?? "");
  const viewerLng = parseFloat(req.url?.match(/[?&]viewerLng=([^&]+)/)?.[1] ?? "");
  if (
    Number.isFinite(viewerLat) && Number.isFinite(viewerLng) &&
    Number.isFinite(Number(user.location_lat)) && Number.isFinite(Number(user.location_lng))
  ) {
    distanceKm = haversineKm(
      { lat: Number(user.location_lat), lng: Number(user.location_lng) },
      { lat: viewerLat, lng: viewerLng },
    );
  }

  sendJson(req, res, 200, {
    data: {
      id: user.id,
      username: user.username,
      name: user.name,
      avatar: avatarUrl,
      accountType: user.account_type,
      status: user.status,
      referralCode: user.referral_code,
      // §3.2 — bio, hourly rate, work hours, remote, skills, location summary
      bio: user.bio,
      hourlyRate: user.hourly_rate,
      currency: user.currency,
      workHours: user.work_hours,
      remote: Boolean(user.remote),
      country: user.country,
      state: user.state,
      city: user.city,
      // Business-only field per §3.2 "Business address (Business only)"
      businessAddress: user.account_type === "Business" ? user.business_address : null,
      distanceKm,
      skills,
      // §3.2 — phone, WhatsApp, links, CV revealed only on Active profiles.
      // Self always sees their own to edit.
      phone: (isActive || isSelf) ? user.phone : null,
      whatsapp: (isActive || isSelf) ? user.whatsapp : null,
      links: (isActive || isSelf) ? links : [],
      cvUrl: (isActive || isSelf) && user.cv_path
        ? publicUrl({ bucket: "cv", path: user.cv_path })
        : null,
      // §3.2 — follow + counts + posts + reviews
      followers: counts.followers,
      following: counts.following,
      isFollowing,
      isSelf,
      posts: visiblePosts.map((p) => publicPostShape(p, {
        viewerIsAuthor: isSelf,
        viewerSignedIn: Boolean(session),
      })),
      reviews,
      reviewAggregate: aggregateRating(reviews),
      // §3.3 hook — frontend renders the "Notify when active" button when
      // status==='inactive' and the viewer is not self.
      notifyWhenActiveAvailable: !isActive && !isSelf,
    },
  });
}

// Pure helper: great-circle distance in km. Local to this handler; if it
// gets re-used elsewhere, factor out into lib/geo.mjs.
function haversineKm(a, b) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Hire requests (Phase 2)
// ---------------------------------------------------------------------------

async function handlePublicHireRequest(req, res) {
  const body = parseJsonBody(await readBody(req));
  const input = pickHireRequestInput(body);
  validateHireRequestInput(input);
  // PRD §8.1 — contact email must clear OTP before submission.
  const verificationId = String(body.otp_verification_id || "").trim();
  if (!verificationId) {
    throw new OtpError(400, "otp_verification_id is required. Verify your email first.", "email");
  }
  const verification = await assertVerificationConsumed({
    id: verificationId,
    email: input.contact_email,
  });
  const created = await createHireRequest({
    ...input,
    email_verified_at: verification.consumed_at,
    otp_verification_id: verification.id,
  });
  sendJson(req, res, 201, { data: { id: created.id, status: created.status } });
}

// PRD §8.1 — request a 6-digit OTP for the hire-request contact email.
async function handleHireRequestOtpRequest(req, res) {
  const body = parseJsonBody(await readBody(req));
  const input = pickOtpRequest(body);
  const issued = await issueOtp({ email: input.email });
  sendJson(req, res, 200, {
    data: { id: issued.id, expiresAt: issued.expiresAt, email: issued.email },
  });
}

// PRD §8.1 — verify the 6-digit OTP. Returns a short-lived verification id
// the frontend then attaches to the hire-request submission.
async function handleHireRequestOtpVerify(req, res) {
  const body = parseJsonBody(await readBody(req));
  const input = pickOtpVerify(body);
  const result = await verifyOtp({ email: input.email, code: input.code });
  sendJson(req, res, 200, {
    data: { id: result.id, email: result.email, consumedAt: result.consumedAt },
  });
}

async function handleAdminHireRequests(req, res, url) {
  await requireAdmin(req);
  const params = url.searchParams;
  const rows = await listHireRequests({
    status: params.get("status") || undefined,
    limit: Math.min(Number(params.get("limit") || 100), 200),
  });
  sendJson(req, res, 200, { data: rows, source: "supabase" });
}

async function handleAdminSendQuote(req, res, _url, params) {
  await requireAdmin(req);
  const hireRequest = await getHireRequestById(params.id);
  if (!hireRequest) throw new HttpError(404, "Hire request not found.");
  if (hireRequest.status !== "new") {
    throw new HttpError(400, `Cannot send a quote when status is '${hireRequest.status}'.`);
  }
  const body = parseJsonBody(await readBody(req));
  const amount = Number(body.amount);
  if (!amount || amount <= 0) throw new HttpError(400, "amount must be a positive number.");

  const orderId = buildOrderId("h", [params.id]);
  const invoice = await createInvoice({
    priceAmount: amount,
    orderId,
    orderDescription: `Needool hire quote for ${hireRequest.role_title} (${hireRequest.employer_name})`,
  });
  const now = new Date();
  const updated = await setQuote({
    id: params.id,
    amount,
    paymentId: String(invoice.id || invoice.invoice_id || ""),
    orderId,
    sentAt: now.toISOString(),
    expiresAt: quoteExpiryDate(now).toISOString(),
  });
  sendJson(req, res, 201, {
    data: {
      hireRequest: updated,
      invoiceUrl: invoice.invoice_url || invoice.invoiceUrl || null,
      invoiceId: invoice.id || invoice.invoice_id || null,
      orderId,
    },
  });
}

async function handleAdminCancelHireRequest(req, res, _url, params) {
  await requireAdmin(req);
  const body = parseJsonBody(await readBody(req));
  const cancelled = await cancelHireRequest({ id: params.id, reason: body.reason });
  sendJson(req, res, 200, { data: cancelled });
}

// ---------------------------------------------------------------------------
// Jobs — public + member
// ---------------------------------------------------------------------------

async function handlePublicJobsList(req, res) {
  const openings = await listJobOpenings({ status: "open", limit: 100 });
  const data = [];
  for (const row of openings) {
    const questions = await listQuestions(row.id);
    data.push(publicJobOpeningShape(row, questions));
  }
  sendJson(req, res, 200, { data, source: "supabase" });
}

async function handlePublicJobDetail(req, res, _url, params) {
  const opening = await getJobOpeningById(params.id);
  if (!opening || opening.status !== "open") {
    sendJson(req, res, 404, { error: "Job opening not found." });
    return;
  }
  const questions = await listQuestions(params.id);
  sendJson(req, res, 200, { data: publicJobOpeningShape(opening, questions) });
}

async function handleApply(req, res, _url, params) {
  const session = await requireSession(req);
  const user = await findUserById(session.userId);
  if (!user) throw new HttpError(404, "User profile not found.");
  const opening = await getJobOpeningById(params.id);
  if (!opening || opening.status !== "open") throw new HttpError(404, "Job opening not found.");
  const eligibility = isUserEligible({ user, opening });
  if (!eligibility.ok) throw new HttpError(403, eligibility.reason);

  const existing = await getApplicationByPair(params.id, user.id);
  if (existing) throw new HttpError(409, "You have already applied to this opening.");

  const body = parseJsonBody(await readBody(req));
  const questions = await listQuestions(params.id);
  const incomingAnswers = Array.isArray(body.answers) ? body.answers : [];
  const answersByQid = new Map(
    incomingAnswers.map((a) => [String(a.question_id), String(a.answer || "").trim()]),
  );
  const normalized = [];
  for (const q of questions) {
    const text = answersByQid.get(q.id);
    if (!text) throw new HttpError(400, `Answer required for: ${q.prompt}`);
    normalized.push({ question_id: q.id, prompt: q.prompt, answer: text });
  }
  const snapshot = {
    name: user.name,
    username: user.username,
    email: user.email,
    accountType: user.account_type,
    capturedAt: new Date().toISOString(),
  };
  const created = await createApplication({
    jobOpeningId: params.id,
    applicantId: user.id,
    snapshot,
    answers: normalized,
  });
  sendJson(req, res, 201, { data: created });
}

async function handleMyApplications(req, res) {
  const session = await requireSession(req);
  const rows = await listApplicationsForUser(session.userId);
  sendJson(req, res, 200, { data: rows });
}

async function handleMyVerifiedHires(req, res) {
  const session = await requireSession(req);
  const rows = await listVerifiedHiresForUser(session.userId);
  // Strip the employer_review_token from this response — only the employer should see it.
  const data = rows.map(({ employer_review_token, ...rest }) => rest);
  sendJson(req, res, 200, { data });
}

// ---------------------------------------------------------------------------
// Admin job openings
// ---------------------------------------------------------------------------

async function handleAdminJobOpenings(req, res, url) {
  await requireAdmin(req);
  const params = url.searchParams;
  const rows = await listJobOpenings({
    status: params.get("status") || undefined,
    limit: Math.min(Number(params.get("limit") || 100), 200),
  });
  sendJson(req, res, 200, { data: rows, source: "supabase" });
}

async function handleAdminUpdateJobOpening(req, res, _url, params) {
  await requireAdmin(req);
  const body = parseJsonBody(await readBody(req));
  const patch = {};
  if (typeof body.title === "string") patch.title = body.title;
  if (typeof body.description === "string") patch.description = body.description;
  if (typeof body.application_instructions === "string") patch.application_instructions = body.application_instructions;
  if (typeof body.eligible_account_type === "string") patch.eligible_account_type = body.eligible_account_type;
  if (Array.isArray(body.eligible_locations)) patch.eligible_locations = body.eligible_locations;
  if (Array.isArray(body.eligible_nationalities)) patch.eligible_nationalities = body.eligible_nationalities;
  if (JOB_EMPLOYMENT_TYPES.includes(body.employment_type)) patch.employment_type = body.employment_type;
  if (typeof body.pinned === "boolean") patch.pinned = body.pinned;
  let opening = Object.keys(patch).length > 0
    ? await updateJobOpening(params.id, patch)
    : await getJobOpeningById(params.id);
  if (Array.isArray(body.questions)) {
    await replaceQuestions(params.id, body.questions);
  }
  const questions = await listQuestions(params.id);
  sendJson(req, res, 200, { data: { opening, questions } });
}

async function handleAdminPublishOpening(req, res, _url, params) {
  await requireAdmin(req);
  const opening = await publishJobOpening(params.id);
  sendJson(req, res, 200, { data: opening });
}

async function handleAdminCloseOpening(req, res, _url, params) {
  await requireAdmin(req);
  const opening = await closeJobOpening(params.id);
  sendJson(req, res, 200, { data: opening });
}

async function handleAdminListApplicants(req, res, _url, params) {
  await requireAdmin(req);
  const rows = await listApplicationsForOpening(params.id);
  sendJson(req, res, 200, { data: rows });
}

async function handleAdminApplicationAction(req, res, _url, params) {
  const admin = await requireAdmin(req);
  const body = parseJsonBody(await readBody(req));
  const action = String(body.action || "").trim();
  const application = await getApplicationById(params.id);
  if (!application) throw new HttpError(404, "Application not found.");

  if (action === "score") {
    const score = Number(body.score);
    if (!Number.isInteger(score) || score < 0 || score > 100) {
      throw new HttpError(400, "score must be an integer between 0 and 100.");
    }
    const updated = await updateApplication(application.id, {
      score,
      notes: body.notes ? String(body.notes) : application.notes,
    });
    sendJson(req, res, 200, { data: updated });
    return;
  }
  if (action === "shortlist" || action === "reject" || action === "review") {
    const statusMap = { shortlist: "shortlisted", reject: "rejected", review: "under_review" };
    const updated = await updateApplication(application.id, { status: statusMap[action] });
    sendJson(req, res, 200, { data: updated });
    return;
  }
  if (action === "mark-hired") {
    const opening = await getJobOpeningById(application.job_opening_id);
    if (!opening) throw new HttpError(404, "Job opening not found.");
    const hireRequest = opening.hire_request_id
      ? await getHireRequestById(opening.hire_request_id)
      : null;
    const employerEmail =
      (body.employer_email && String(body.employer_email).trim())
      || hireRequest?.contact_email
      || `${admin.email}`;
    const employerName = hireRequest?.employer_name || body.employer_name || "Employer";

    const updatedApp = await updateApplication(application.id, {
      status: "hired",
      hired_at: new Date().toISOString(),
    });
    const verifiedHire = await createVerifiedHire({
      application: updatedApp,
      employerEmail,
      employerName,
      openingId: opening.id,
      jobTitle: opening.title,
    });
    sendJson(req, res, 201, { data: { application: updatedApp, verifiedHire } });
    return;
  }

  throw new HttpError(400, "action must be score|shortlist|review|reject|mark-hired.");
}

// ---------------------------------------------------------------------------
// Reviews (Trigger A)
// ---------------------------------------------------------------------------

async function handleSubmitApplicantReview(req, res) {
  const session = await requireSession(req);
  const body = parseJsonBody(await readBody(req));
  const verifiedHireId = String(body.verifiedHireId || body.verified_hire_id || "").trim();
  if (!verifiedHireId) throw new HttpError(400, "verifiedHireId is required.");
  const verifiedHire = await getVerifiedHireById(verifiedHireId);
  if (!verifiedHire) throw new HttpError(404, "Verified hire not found.");

  const existing = await getReviewByVerifiedHireAndKind(verifiedHireId, "applicant");
  if (existing) throw new HttpError(409, "You have already submitted a review for this hire.");

  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new HttpError(400, "rating must be an integer between 1 and 5.");
  }
  const review = await submitApplicantReview({
    verifiedHire,
    applicantUserId: session.userId,
    rating,
    comment: body.comment,
    evidenceUrl: body.evidenceUrl || body.evidence_url,
  });
  sendJson(req, res, 201, { data: review });
}

// PRD §8.6 + §18.2 — employer reviewer-only persistent surface.
// Authenticated entirely by the magic-link token; no Clerk session needed.
// Returns the cluster of verified hires the employer can review + the
// reviews they've already submitted. Touches last_seen_at on every call.
async function handleEmployerAccount(req, res, url) {
  const token = url.searchParams.get("token") || "";
  if (!token) throw new HttpError(400, "token query param is required.");
  const account = await resolveEmployerAccount({ token });
  if (!account) {
    sendJson(req, res, 404, { error: "Token not recognized." });
    return;
  }
  const verifiedHires = [];
  for (const vh of account.cluster) {
    const applicant = vh.applicant_id ? await findUserById(vh.applicant_id) : null;
    const submitted = await getReviewByVerifiedHireAndKind(vh.id, "employer");
    verifiedHires.push({
      id: vh.id,
      jobOpeningId: vh.job_opening_id,
      employerName: vh.employer_name,
      reviewerUnlockAt: vh.reviewer_unlock_at,
      reviewWindowEndAt: vh.review_window_end_at,
      createdAt: vh.created_at,
      // Mirror the token only on the primary so the frontend can route the
      // "leave a review" deep-link back to its existing form.
      reviewToken: vh.id === account.primary.id ? token : null,
      applicant: applicant
        ? {
            id: applicant.id,
            username: applicant.username,
            name: applicant.name,
            avatar: applicant.avatar,
          }
        : null,
      employerReviewSubmitted: Boolean(submitted),
      employerReview: submitted
        ? { rating: submitted.rating, comment: submitted.comment, createdAt: submitted.created_at }
        : null,
    });
  }
  sendJson(req, res, 200, {
    data: {
      employer: {
        email: account.primary.employer_email,
        name: account.primary.employer_name,
        accountCreatedAt: account.primary.employer_account_created_at,
        lastSeenAt: account.primary.employer_account_last_seen_at,
      },
      verifiedHires,
    },
  });
}

async function handleReviewTokenLookup(req, res, _url, params) {
  const verifiedHire = await getVerifiedHireByToken(params.token);
  if (!verifiedHire) {
    sendJson(req, res, 404, { error: "Token not recognized." });
    return;
  }
  const applicant = await findUserById(verifiedHire.applicant_id);
  sendJson(req, res, 200, {
    data: {
      verifiedHireId: verifiedHire.id,
      applicant: applicant
        ? {
            username: applicant.username,
            name: applicant.name,
            avatar: applicant.avatar,
          }
        : null,
      employerName: verifiedHire.employer_name,
      reviewerUnlockAt: verifiedHire.reviewer_unlock_at,
      reviewWindowEndAt: verifiedHire.review_window_end_at,
    },
  });
}

async function handleSubmitEmployerReview(req, res) {
  const body = parseJsonBody(await readBody(req));
  const token = String(body.token || "").trim();
  if (!token) throw new HttpError(400, "token is required.");
  const verifiedHire = await getVerifiedHireByToken(token);
  if (!verifiedHire) throw new HttpError(404, "Token not recognized.");

  const existing = await getReviewByVerifiedHireAndKind(verifiedHire.id, "employer");
  if (existing) throw new HttpError(409, "A review for this hire has already been submitted by the employer.");

  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new HttpError(400, "rating must be an integer between 1 and 5.");
  }
  const review = await submitEmployerReview({
    verifiedHire,
    rating,
    comment: body.comment,
    evidenceUrl: body.evidenceUrl || body.evidence_url,
  });
  sendJson(req, res, 201, { data: review });
}

async function handleProfileReviews(req, res, _url, params) {
  const reviews = await listReviewsForTargetUser(params.userId);
  sendJson(req, res, 200, {
    data: {
      reviews,
      aggregate: aggregateRating(reviews),
    },
  });
}

// Phase 4D-6 — SEO sitemap (PRD §4.4) -----------------------------------

async function handleSitemapXml(req, res) {
  const base = (env.PUBLIC_SITE_URL || "").replace(/\/$/, "")
    || `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host || "localhost"}`;
  const [users, posts, jobs, helpArticles] = await Promise.all([
    selectMany(
      "users",
      "select=username,updated_at,status&deleted_at=is.null&status=neq.banned&limit=5000",
    ).catch(() => []),
    selectMany(
      "posts",
      "select=id,updated_at,kind&status=eq.approved&closed_at=is.null&limit=5000",
    ).catch(() => []),
    selectMany(
      "job_openings",
      "select=id,updated_at&status=eq.open&limit=5000",
    ).catch(() => []),
    // Phase 4G — Help & Guide is SEO-indexed (PRD §14).
    selectMany(
      "help_articles",
      "select=slug,updated_at&status=eq.published&limit=5000",
    ).catch(() => []),
  ]);

  const urls = [
    { loc: `${base}/`, priority: "1.0" },
    { loc: `${base}/needs`, priority: "0.9" },
    { loc: `${base}/opportunities`, priority: "0.9" },
    { loc: `${base}/events`, priority: "0.8" },
    { loc: `${base}/jobs`, priority: "0.8" },
    { loc: `${base}/help`, priority: "0.8" },
    { loc: `${base}/pricing`, priority: "0.6" },
    { loc: `${base}/search`, priority: "0.7" },
  ];
  for (const a of helpArticles) {
    urls.push({
      loc: `${base}/help/${encodeURIComponent(a.slug)}`,
      lastmod: a.updated_at,
      priority: "0.7",
    });
  }
  for (const u of users) {
    urls.push({
      loc: `${base}/p/${encodeURIComponent(u.username)}`,
      lastmod: u.updated_at,
      priority: u.status === "active" ? "0.7" : "0.4",
    });
  }
  for (const p of posts) {
    urls.push({
      loc: `${base}/posts/${p.id}`,
      lastmod: p.updated_at,
      priority: "0.6",
    });
  }
  for (const j of jobs) {
    urls.push({
      loc: `${base}/jobs/${j.id}`,
      lastmod: j.updated_at,
      priority: "0.6",
    });
  }

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls
      .map(
        (u) =>
          `  <url>\n    <loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${escapeXml(String(u.lastmod).slice(0, 10))}</lastmod>` : ""}${u.priority ? `\n    <priority>${u.priority}</priority>` : ""}\n  </url>`,
      )
      .join("\n") +
    "\n</urlset>\n";

  res.writeHead(200, {
    "content-type": "application/xml; charset=utf-8",
    "access-control-allow-origin": getCorsOrigin(req),
    "cache-control": "public, max-age=900",
  });
  res.end(xml);
}

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));
}

async function handleRobotsTxt(req, res) {
  const base = (env.PUBLIC_SITE_URL || "").replace(/\/$/, "")
    || `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host || "localhost"}`;
  const body = `User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`;
  res.writeHead(200, {
    "content-type": "text/plain; charset=utf-8",
    "access-control-allow-origin": getCorsOrigin(req),
    "cache-control": "public, max-age=3600",
  });
  res.end(body);
}

// Phase 4H — Web push subscription endpoints (PRD §12 push channel, §15.5).

async function handleListPushSubscriptions(req, res) {
  const session = await requireSession(req);
  const rows = await listPushSubscriptionsForUser(session.userId);
  sendJson(req, res, 200, { data: rows });
}

async function handleSubscribePush(req, res) {
  const session = await requireSession(req);
  const body = parseJsonBody(await readBody(req));
  body.user_agent = body.user_agent || req.headers["user-agent"] || null;
  try {
    const row = await upsertPushSubscription({ userId: session.userId, input: body });
    sendJson(req, res, 201, { data: row });
  } catch (e) {
    if (e instanceof PushSubError) throw new HttpError(e.status, e.message);
    throw e;
  }
}

async function handleUnsubscribePush(req, res) {
  const session = await requireSession(req);
  const body = parseJsonBody(await readBody(req));
  try {
    const result = await deletePushSubscription({
      userId: session.userId,
      endpoint: body.endpoint,
    });
    sendJson(req, res, 200, { data: result });
  } catch (e) {
    if (e instanceof PushSubError) throw new HttpError(e.status, e.message);
    throw e;
  }
}

// Phase 4G — Help & Guide CMS + notification preferences (PRD §14, §12)

async function handleHelpList(req, res, url) {
  const params = url.searchParams;
  const rows = await listPublishedArticles({
    category: params.get("category") || undefined,
    q: params.get("q") || undefined,
    limit: Math.min(Number(params.get("limit") || 100), 200),
  });
  const categories = await listArticleCategories();
  sendJson(req, res, 200, { data: { articles: rows, categories } });
}

async function handleHelpDetail(req, res, _url, params) {
  const row = await findArticleBySlug(params.slug);
  if (!row || row.status !== "published") {
    sendJson(req, res, 404, { error: "Article not found." });
    return;
  }
  sendJson(req, res, 200, { data: row });
}

async function handleAdminHelpList(req, res, url) {
  await requireAdmin(req);
  const status = url.searchParams.get("status") || undefined;
  const rows = await listAllArticlesForAdmin({ status });
  sendJson(req, res, 200, { data: rows });
}

async function handleAdminCreateHelp(req, res) {
  const session = await requireAdmin(req);
  const body = parseJsonBody(await readBody(req));
  try {
    const row = await createArticle({ input: body, authorId: session.userId });
    sendJson(req, res, 201, { data: row });
  } catch (e) {
    if (e instanceof HelpError) throw new HttpError(e.status, e.message);
    throw e;
  }
}

async function handleAdminUpdateHelp(req, res, _url, params) {
  const body = parseJsonBody(await readBody(req));
  try {
    const row = await updateArticle({ id: params.id, input: body });
    sendJson(req, res, 200, { data: row });
  } catch (e) {
    if (e instanceof HelpError) throw new HttpError(e.status, e.message);
    throw e;
  }
}

async function handleAdminPublishHelp(req, res, _url, params) {
  try {
    const row = await publishArticle({ id: params.id });
    sendJson(req, res, 200, { data: row });
  } catch (e) {
    if (e instanceof HelpError) throw new HttpError(e.status, e.message);
    throw e;
  }
}

async function handleAdminArchiveHelp(req, res, _url, params) {
  try {
    const row = await archiveArticle({ id: params.id });
    sendJson(req, res, 200, { data: row });
  } catch (e) {
    if (e instanceof HelpError) throw new HttpError(e.status, e.message);
    throw e;
  }
}

async function handleGetNotificationPrefs(req, res) {
  const session = await requireSession(req);
  const rows = await listPreferences(session.userId);
  sendJson(req, res, 200, {
    data: {
      preferences: rows,
      mandatory: [...MANDATORY_EVENT_TYPES],
    },
  });
}

async function handlePatchNotificationPrefs(req, res) {
  const session = await requireSession(req);
  const body = parseJsonBody(await readBody(req));
  try {
    const row = await setPreference({ userId: session.userId, patch: body });
    sendJson(req, res, 200, { data: row });
  } catch (e) {
    if (e instanceof NotificationPrefError) throw new HttpError(e.status, e.message);
    throw e;
  }
}

// Phase 4D-5 — Search & ranking (PRD §4.1, §4.2, §4.3) --------------------

async function handleSearch(req, res, url) {
  const params = Object.fromEntries(url.searchParams.entries());
  const q = url.searchParams.get("q") || "";
  try {
    const input = pickSearchInput(q, params);
    const out = await searchUsers(input);
    sendJson(req, res, 200, { data: out });
  } catch (e) {
    if (e instanceof SearchError) throw new HttpError(e.status, e.message);
    throw e;
  }
}

// Phase 4D-4 — Notify-when-active + contact intent (PRD §3.3, §3.4) -----

async function handleNotifyWhenActive(req, res, _url, params) {
  const session = await requireSession(req);
  try {
    const result = await requestNotifyWhenActive({
      targetUserId: params.userId,
      requesterId: session.userId,
    });
    sendJson(req, res, result.created ? 201 : 200, {
      data: {
        id: result.row.id,
        status: result.row.status,
        expiresAt: result.row.expires_at,
        created: result.created,
      },
    });
  } catch (e) {
    if (e instanceof NotifyActiveError) throw new HttpError(e.status, e.message);
    throw e;
  }
}

async function handleContactIntent(req, res, _url, params) {
  const session = await optionalSession(req);
  const body = parseJsonBody(await readBody(req));
  try {
    const intent = pickContactIntent(body);
    if (!session) {
      // PRD §3.4 — only logged-in viewers generate notifications. We still
      // accept the call to keep the client logic simple but no-op silently.
      sendJson(req, res, 204, null);
      return;
    }
    const result = await logContactIntent({
      targetUserId: params.userId,
      viewerId: session.userId,
      intent,
    });
    sendJson(req, res, 200, { data: result });
  } catch (e) {
    if (e instanceof NotifyActiveError) throw new HttpError(e.status, e.message);
    throw e;
  }
}

async function handleDevExpireNotifySweep(req, res) {
  if (!isDev()) {
    sendJson(req, res, 404, { error: "Not found" });
    return;
  }
  const expired = await expireStalePendingRequests();
  sendJson(req, res, 200, { data: { expired } });
}

// Phase 4D-2 — Profile composition + edit + frequency limits (PRD §3.1, §2.6)

// Phase 9 — accepts the demographic payload from /onboarding, persists it
// onto the users row, and resolves the referrer (typed-wins-cookie per
// PRD §2.7). Called once per user after Clerk signup completes.
async function handleOnboardingComplete(req, res) {
  const session = await requireSession(req);
  const body = parseJsonBody(await readBody(req));
  const user = await findUserById(session.userId);
  if (!user) throw new HttpError(404, "User not found.");

  const validAccountTypes = new Set(["Individual", "Business"]);
  const accountType = validAccountTypes.has(body.accountType)
    ? body.accountType
    : "Individual";

  // PRD §2.6 — phone / WhatsApp / location all editable; demographic captured
  // once at onboarding without the 30-day frequency lock since this is the
  // FIRST write. Frequency rules apply to subsequent edits via
  // updateProfile() (frontend dashboard).
  const patch = {
    account_type: accountType,
    nationality: typeof body.nationality === "string" ? body.nationality.trim() || null : null,
    phone: typeof body.phone === "string" ? body.phone.trim() || null : null,
    whatsapp: typeof body.whatsapp === "string" ? body.whatsapp.trim() || null : null,
    country: typeof body.country === "string" ? body.country.trim() || null : null,
    state: typeof body.state === "string" ? body.state.trim() || null : null,
    city: typeof body.city === "string" ? body.city.trim() || null : null,
  };

  if (accountType === "Individual") {
    if (typeof body.middleName === "string") patch.middle_name = body.middleName.trim() || null;
    const validSex = new Set(["Male", "Female", "Other"]);
    if (validSex.has(body.sex)) patch.sex = body.sex;
    if (typeof body.dateOfBirth === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dateOfBirth)) {
      patch.date_of_birth = body.dateOfBirth;
    }
  } else {
    if (typeof body.businessAddress === "string") {
      patch.business_address = body.businessAddress.trim() || null;
    }
    const validOffice = new Set(["HQ", "Branch"]);
    if (validOffice.has(body.officeType)) patch.office_type = body.officeType;
    if (typeof body.hqAddress === "string") patch.hq_address = body.hqAddress.trim() || null;
    if (typeof body.hqCountry === "string") patch.hq_country = body.hqCountry.trim() || null;
    if (typeof body.hqState === "string") patch.hq_state = body.hqState.trim() || null;
    if (typeof body.hqCity === "string") patch.hq_city = body.hqCity.trim() || null;
  }

  // PRD §2.7 — referrer attribution. Typed wins over cookie. Silent drop if
  // the typed referrer doesn't resolve.
  if (!user.referred_by) {
    const typed = typeof body.referredBy === "string"
      ? body.referredBy.trim().toUpperCase()
      : "";
    if (typed) {
      const referrer = await findUserByReferralCode(typed);
      if (referrer) patch.referred_by = typed;
    }
  }

  const { updateRows } = await import("./lib/supabase.mjs");
  await updateRows("users", `id=eq.${encodeURIComponent(session.userId)}`, patch);
  const updated = await findUserById(session.userId);
  sendJson(req, res, 200, { data: { user: publicUserShape(updated) } });
}

async function handleGetMyProfile(req, res) {
  const session = await requireSession(req);
  const user = await findUserById(session.userId);
  if (!user) throw new HttpError(404, "User not found.");
  const [links, skills] = await Promise.all([
    listLinks(user.id),
    listSkills(user.id),
  ]);
  sendJson(req, res, 200, {
    data: {
      user: publicUserShape(user),
      links,
      skills,
      avatarUrl: user.profile_picture_path
        ? publicUrl({ bucket: "avatars", path: user.profile_picture_path })
        : null,
      cvUrl: user.cv_path ? publicUrl({ bucket: "cv", path: user.cv_path }) : null,
      caps: {
        bio: user.account_type === "Business" ? 1000 : 500,
        links: linkCap(user.account_type),
        skills: skillCap(user.account_type),
      },
    },
  });
}

async function handlePatchMyProfile(req, res) {
  const session = await requireSession(req);
  const body = parseJsonBody(await readBody(req));
  try {
    const user = await updateProfile({ userId: session.userId, input: body });
    sendJson(req, res, 200, { data: publicUserShape(user) });
  } catch (e) {
    if (e instanceof ProfileError) throw new HttpError(e.status, e.message);
    throw e;
  }
}

async function handleAddLink(req, res) {
  const session = await requireSession(req);
  const body = parseJsonBody(await readBody(req));
  try {
    const row = await addLink({ userId: session.userId, label: body.label, url: body.url });
    sendJson(req, res, 201, { data: row });
  } catch (e) {
    if (e instanceof ProfileError) throw new HttpError(e.status, e.message);
    throw e;
  }
}

async function handleRemoveLink(req, res, _url, params) {
  const session = await requireSession(req);
  try {
    const row = await removeLink({ userId: session.userId, linkId: params.id });
    sendJson(req, res, 200, { data: row });
  } catch (e) {
    if (e instanceof ProfileError) throw new HttpError(e.status, e.message);
    throw e;
  }
}

async function handleAddSkill(req, res) {
  const session = await requireSession(req);
  const body = parseJsonBody(await readBody(req));
  try {
    const row = await addSkill({
      userId: session.userId,
      kind: body.kind,
      label: body.label,
      category: body.category,
    });
    sendJson(req, res, 201, { data: row });
  } catch (e) {
    if (e instanceof ProfileError) throw new HttpError(e.status, e.message);
    throw e;
  }
}

async function handleRemoveSkill(req, res, _url, params) {
  const session = await requireSession(req);
  try {
    const row = await removeSkill({ userId: session.userId, skillId: params.id });
    sendJson(req, res, 200, { data: row });
  } catch (e) {
    if (e instanceof ProfileError) throw new HttpError(e.status, e.message);
    throw e;
  }
}

async function handleUploadAvatar(req, res) {
  const session = await requireSession(req);
  const user = await findUserById(session.userId);
  if (!user) throw new HttpError(404, "User not found.");
  if (user.status !== "active") throw new HttpError(403, "Profile picture is editable only on Active accounts.");
  const contentType = req.headers["content-type"] || "application/octet-stream";
  if (!contentType.startsWith("image/")) {
    throw new HttpError(415, "Profile picture must be an image (image/jpeg, image/png, image/webp).");
  }
  const buffer = await readBytes(req);
  if (buffer.length === 0) throw new HttpError(400, "Empty upload.");
  if (buffer.length > MAX_FILE_BYTES) {
    throw new HttpError(400, "Profile picture exceeds the 5 MB cap.");
  }
  // PRD §3.1 — "previous image deleted on change".
  if (user.profile_picture_path) {
    await deleteObject({ bucket: "avatars", path: user.profile_picture_path }).catch(() => {});
  }
  const ext = contentType.split("/")[1]?.split(";")[0] || "bin";
  const path = `${session.userId}/${Date.now()}.${ext}`;
  await uploadObject({ bucket: "avatars", path, body: buffer, contentType });
  const updated = await setProfilePicturePath({ userId: session.userId, path });
  sendJson(req, res, 200, {
    data: {
      user: publicUserShape(updated),
      avatarUrl: publicUrl({ bucket: "avatars", path }),
    },
  });
}

async function handleUploadCv(req, res) {
  const session = await requireSession(req);
  const user = await findUserById(session.userId);
  if (!user) throw new HttpError(404, "User not found.");
  const contentType = req.headers["content-type"] || "application/octet-stream";
  if (contentType !== "application/pdf") {
    throw new HttpError(415, "CV must be a PDF (application/pdf).");
  }
  const buffer = await readBytes(req);
  if (buffer.length === 0) throw new HttpError(400, "Empty upload.");
  if (buffer.length > MAX_FILE_BYTES) {
    throw new HttpError(400, "CV exceeds the 5 MB cap.");
  }
  // PRD §3.1 — single CV file. Replace if present.
  if (user.cv_path) {
    await deleteObject({ bucket: "cv", path: user.cv_path }).catch(() => {});
  }
  const path = `${session.userId}/${Date.now()}.pdf`;
  await uploadObject({ bucket: "cv", path, body: buffer, contentType });
  const extractedText = await extractPdfText(buffer);
  const updated = await setCvPath({ userId: session.userId, path, extractedText });
  sendJson(req, res, 200, {
    data: {
      user: publicUserShape(updated),
      cvUrl: publicUrl({ bucket: "cv", path }),
      extractedTextLength: extractedText.length,
    },
  });
}

// Phase 4C — Reviews Trigger B + §9.4 anti-abuse + kill-switch ---------------

async function handleCanReviewProfile(req, res, _url, params) {
  const session = await requireSession(req);
  const reviewerId = session.userId;
  const targetUserId = params.userId;
  if (reviewerId === targetUserId) {
    sendJson(req, res, 200, { data: { canReview: false, reason: "You cannot review yourself." } });
    return;
  }
  const gate = await canReviewProfile({ reviewerId, targetUserId });
  if (!gate.ok) {
    sendJson(req, res, 200, { data: { canReview: false, reason: gate.reason, status: gate.status } });
    return;
  }
  sendJson(req, res, 200, { data: { canReview: true } });
}

async function handleSubmitTriggerBReview(req, res, _url, params) {
  const session = await requireSession(req);
  const body = parseJsonBody(await readBody(req));
  const rating = Number(body.rating);
  const targetUserId = params.userId;
  try {
    const row = await submitTriggerBReview({
      reviewerId: session.userId,
      targetUserId,
      rating,
      comment: body.comment,
      evidenceUrl: body.evidenceUrl || body.evidence_url,
    });
    sendJson(req, res, 201, { data: row });
  } catch (e) {
    if (e instanceof TriggerBError) throw new HttpError(e.status, e.message);
    throw e;
  }
}

async function handleReportReview(req, res, _url, params) {
  const session = await requireSession(req);
  const body = parseJsonBody(await readBody(req));
  try {
    const row = await createReviewReport({
      reviewId: params.id,
      reporterId: session.userId,
      reason: body.reason,
    });
    sendJson(req, res, 201, { data: row });
  } catch (e) {
    if (e instanceof TriggerBError) throw new HttpError(e.status, e.message);
    throw e;
  }
}

// PRD §9.6 — the reviewed user can post one public reply per review,
// editable for 14 days.
async function handleSubmitReviewReply(req, res, _url, params) {
  const session = await requireSession(req);
  const body = parseJsonBody(await readBody(req));
  const updated = await submitReviewReply({
    reviewId: params.id,
    callerUserId: session.userId,
    input: body,
  });
  sendJson(req, res, 200, { data: updated });
}

async function handleAdminListHeldReviews(req, res, url) {
  await requireAdmin(req);
  const status = url.searchParams.get("status") || "held";
  if (status === "reports") {
    const reports = await listReportedReviews();
    sendJson(req, res, 200, { data: reports });
    return;
  }
  const rows = await listHeldReviews();
  sendJson(req, res, 200, { data: rows });
}

async function handleAdminReviewAction(req, res, _url, params) {
  const body = parseJsonBody(await readBody(req));
  const action = String(body.action || "").trim();
  if (action === "approve") {
    const row = await approveHeldReview({ reviewId: params.id });
    sendJson(req, res, 200, { data: row });
    return;
  }
  if (action === "reject") {
    const row = await rejectHeldReview({ reviewId: params.id, holdReason: body.reason });
    sendJson(req, res, 200, { data: row });
    return;
  }
  if (action === "ban-reviewer") {
    const review = await listHeldReviews({ limit: 500 });
    const target = review.find((r) => r.id === params.id);
    if (!target?.reviewer_id) {
      throw new HttpError(404, "Reviewer not found on this review.");
    }
    await restrictUser(target.reviewer_id, {
      modules: ["reviewing"],
      reason: body.reason || "Trigger B abuse",
    });
    sendJson(req, res, 200, { data: { restricted: true, userId: target.reviewer_id } });
    return;
  }
  if (action === "resolve-report") {
    const row = await resolveReviewReport({
      reportId: body.reportId || params.id,
      adminId: body.adminId || null,
      action: body.outcome === "removed" ? "removed" : "kept",
    });
    sendJson(req, res, 200, { data: row });
    return;
  }
  throw new HttpError(400, "Unknown action. Use approve | reject | ban-reviewer | resolve-report.");
}

async function handleAdminListFeatureFlags(req, res) {
  await requireAdmin(req);
  const rows = await listFeatureFlags();
  sendJson(req, res, 200, { data: rows });
}

async function handleAdminSetFeatureFlag(req, res, _url, params) {
  const body = parseJsonBody(await readBody(req));
  const session = await requireSession(req);
  const row = await setFeatureFlag({
    key: params.key,
    enabled: Boolean(body.enabled),
    updatedByEmail: session.email || null,
  });
  sendJson(req, res, 200, { data: row });
}

async function handleDevBackdateFreq(req, res) {
  if (!isDev()) {
    sendJson(req, res, 404, { error: "Not found" });
    return;
  }
  const body = parseJsonBody(await readBody(req));
  const userId = String(body.userId || "").trim();
  if (!userId) throw new HttpError(400, "userId is required.");
  const { updateRows } = await import("./lib/supabase.mjs");
  // Allow caller to set any of these stamps; null wipes it (next change OK).
  const fields = [
    "phone_updated_at",
    "whatsapp_updated_at",
    "location_updated_at",
    "gps_updated_at",
    "profile_picture_updated_at",
    "cv_updated_at",
  ];
  const patch = {};
  for (const f of fields) {
    if (Object.hasOwn(body, f)) patch[f] = body[f];
  }
  if (Object.keys(patch).length === 0) {
    throw new HttpError(400, "Provide at least one *_updated_at field to backdate.");
  }
  await updateRows("users", `id=eq.${encodeURIComponent(userId)}`, patch);
  sendJson(req, res, 200, { data: { id: userId, patch } });
}

async function handleDevBackdateSkill(req, res) {
  if (!isDev()) {
    sendJson(req, res, 404, { error: "Not found" });
    return;
  }
  const body = parseJsonBody(await readBody(req));
  const skillId = String(body.skillId || body.id || "").trim();
  const createdAt = String(body.createdAt || body.created_at || "").trim();
  if (!skillId || !createdAt) {
    throw new HttpError(400, "skillId and createdAt are required.");
  }
  const { updateRows } = await import("./lib/supabase.mjs");
  await updateRows("user_skills", `id=eq.${encodeURIComponent(skillId)}`, { created_at: createdAt });
  sendJson(req, res, 200, { data: { id: skillId, created_at: createdAt } });
}

async function handleDevSignupCapture(req, res) {
  if (!isDev()) {
    sendJson(req, res, 404, { error: "Not found" });
    return;
  }
  const body = parseJsonBody(await readBody(req));
  const accountType = body.accountType === "Business" ? "Business" : "Individual";
  // Pure validation paths — surface the SignupError to the caller in dev so
  // the Playwright suite can assert exact 400 messages.
  try {
    if (accountType === "Individual") pickIndividualSignup(body);
    if (accountType === "Business") pickBusinessSignup(body);
  } catch (e) {
    if (e instanceof SignupError) {
      sendJson(req, res, e.status, { error: e.message, field: e.field });
      return;
    }
    throw e;
  }
  const fakeClerkUser = {
    id: body.id || `user_dev_signup_${Date.now()}`,
    email_addresses: [{ id: "e1", email_address: body.email || `${Date.now()}@example.com` }],
    primary_email_address_id: "e1",
    first_name: body.firstName || null,
    last_name: body.lastName || null,
    image_url: body.imageUrl || null,
    unsafe_metadata: body,
  };
  await upsertUserFromClerk(fakeClerkUser, {
    referredBy: body.referredBy || null,
    referredByCookie: body.referredByCookie || null,
    accountType,
    individual: accountType === "Individual" ? pickIndividualSignup(body) : null,
    business: accountType === "Business" ? pickBusinessSignup(body) : null,
  });
  const user = await findUserById(fakeClerkUser.id);
  sendJson(req, res, 201, { data: user });
}

async function handleDevSeedReview(req, res) {
  if (!isDev()) {
    sendJson(req, res, 404, { error: "Not found" });
    return;
  }
  const body = parseJsonBody(await readBody(req));
  const { insertRow } = await import("./lib/supabase.mjs");
  const row = await insertRow(
    "reviews",
    {
      trigger_type: body.triggerType || "member",
      reviewer_id: body.reviewerId,
      reviewer_kind: body.reviewerKind || "member",
      target_user_id: body.targetUserId,
      rating: body.rating ?? 5,
      comment: body.comment ?? null,
      evidence_url: body.evidenceUrl ?? null,
      status: body.status || "live",
      created_at: body.createdAt || new Date().toISOString(),
    },
    { returning: "representation" },
  );
  sendJson(req, res, 200, { data: row });
}

async function handleDevSeedUser(req, res) {
  if (!isDev()) {
    sendJson(req, res, 404, { error: "Not found" });
    return;
  }
  const body = parseJsonBody(await readBody(req));
  const id = String(body.id || `user_dev_seed_${Date.now()}`);
  const email = String(body.email || `${id}@example.com`);
  const username = String(body.username || id.toLowerCase());
  const { upsertRow } = await import("./lib/supabase.mjs");
  const row = await upsertRow(
    "users",
    {
      id,
      email,
      username,
      name: body.name || username,
      account_type: body.accountType || "Individual",
      status: body.status || "active",
      profile_complete: true,
      referral_code: (body.referralCode || username).toUpperCase(),
      referred_by: body.referredBy || null,
      active_since: body.activeSince || new Date().toISOString(),
      created_at: body.createdAt || new Date().toISOString(),
    },
    "id",
    { returning: "representation" },
  );
  sendJson(req, res, 200, { data: row });
}

async function handleDevSetActiveSince(req, res) {
  if (!isDev()) {
    sendJson(req, res, 404, { error: "Not found" });
    return;
  }
  const body = parseJsonBody(await readBody(req));
  const userId = String(body.userId || "").trim();
  const activeSince = body.activeSince ?? body.active_since ?? null;
  if (!userId) throw new HttpError(400, "userId is required.");
  const { updateRows } = await import("./lib/supabase.mjs");
  await updateRows("users", `id=eq.${encodeURIComponent(userId)}`, {
    active_since: activeSince || null,
  });
  const user = await findUserById(userId);
  sendJson(req, res, 200, { data: { id: user?.id, active_since: user?.active_since } });
}

async function handleDevExpireReviewWindows(req, res) {
  if (!isDev()) {
    sendJson(req, res, 404, { error: "Not found" });
    return;
  }
  const body = parseJsonBody(await readBody(req));
  const id = String(body.verifiedHireId || body.id || "").trim();
  if (!id) throw new HttpError(400, "verifiedHireId is required.");
  const mode = body.mode === "expire" ? "expire" : "unlock";
  const updated = await expireReviewWindow({ id, mode });
  sendJson(req, res, 200, { data: updated, mode });
}

// Phase 5 — idempotent dev seed endpoints (PRD §17 + §19).
async function handleDevSeedLagosProviders(req, res) {
  if (!isDev()) { sendJson(req, res, 404, { error: "Not found" }); return; }
  const body = parseJsonBody(await readBody(req).catch(() => ""));
  const count = Math.max(1, Math.min(Number(body.count) || 50, 200));
  const { seedLagosProviders } = await import("./lib/seed-data.mjs");
  const result = await seedLagosProviders({ count });
  sendJson(req, res, 200, { data: result });
}

async function handleDevSeedNeedRequests(req, res) {
  if (!isDev()) { sendJson(req, res, 404, { error: "Not found" }); return; }
  const body = parseJsonBody(await readBody(req).catch(() => ""));
  const count = Math.max(1, Math.min(Number(body.count) || 30, 200));
  const { seedNeedRequests } = await import("./lib/seed-data.mjs");
  const result = await seedNeedRequests({ count });
  sendJson(req, res, 200, { data: result });
}

async function handleDevSeedHelpArticles(req, res) {
  if (!isDev()) { sendJson(req, res, 404, { error: "Not found" }); return; }
  const { seedHelpArticles } = await import("./lib/seed-data.mjs");
  const result = await seedHelpArticles();
  sendJson(req, res, 200, { data: result });
}

async function handleDevSeedAll(req, res) {
  if (!isDev()) { sendJson(req, res, 404, { error: "Not found" }); return; }
  const body = parseJsonBody(await readBody(req).catch(() => ""));
  const providers = Math.max(1, Math.min(Number(body.providers) || 50, 200));
  const needs = Math.max(1, Math.min(Number(body.needs) || 30, 200));
  const { seedAll } = await import("./lib/seed-data.mjs");
  const result = await seedAll({ providers, needs });
  sendJson(req, res, 200, { data: result });
}

async function handleDevRunLaunchQa(req, res) {
  if (!isDev()) { sendJson(req, res, 404, { error: "Not found" }); return; }
  const { runLaunchQa } = await import("./lib/launch-qa.mjs");
  const result = await runLaunchQa();
  sendJson(req, res, 200, { data: result });
}

// Phase 3C — subscription expiry tick.
// In production this is called by Render Cron every ~5 min (with a shared
// secret header in front of it). In dev it's open and idempotent so the
// Playwright/API gate can call it directly.
async function handleRunExpiryTick(req, res) {
  const body = parseJsonBody(await readBody(req).catch(() => ""));
  const nowOverride = body && body.now ? new Date(body.now) : undefined;
  const result = await runExpiryTick(
    nowOverride && !Number.isNaN(nowOverride.getTime()) ? { now: nowOverride } : {},
  );
  sendJson(req, res, 200, { data: result });
}

// Dev helper: nudge a subscription's current_period_end to a given ISO string
// so the expiry tick has something to act on. Only mounted in dev.
async function handleDevSetSubscriptionExpiry(req, res) {
  if (!isDev()) {
    sendJson(req, res, 404, { error: "Not found" });
    return;
  }
  const body = parseJsonBody(await readBody(req));
  const subscriptionId = String(body.subscriptionId || body.id || "").trim();
  const periodEnd = String(body.periodEnd || body.current_period_end || "").trim();
  if (!subscriptionId) throw new HttpError(400, "subscriptionId is required.");
  if (!periodEnd) throw new HttpError(400, "periodEnd is required (ISO timestamp).");
  const updated = await devSetSubscriptionExpiry({ subscriptionId, periodEnd });
  if (!updated) {
    sendJson(req, res, 404, { error: "Subscription not found." });
    return;
  }
  sendJson(req, res, 200, { data: updated });
}

// ---------------------------------------------------------------------------
// Notifications (Phase 3B)
// ---------------------------------------------------------------------------

async function handleListNotifications(req, res, url) {
  const session = await requireSession(req);
  const params = url.searchParams;
  const limit = Math.min(Number(params.get("limit") || 50), 200);
  const rows = await listNotificationsForUser(session.userId, { limit });
  const unread = rows.filter((r) => !r.read_at).length;
  sendJson(req, res, 200, {
    data: rows,
    meta: { unread, emailConfigured: isEmailConfigured() },
  });
}

async function handleUnreadCount(req, res) {
  const session = await requireSession(req);
  const count = await unreadCountForUser(session.userId);
  sendJson(req, res, 200, { data: { count } });
}

async function handleMarkNotificationRead(req, res, _url, params) {
  const session = await requireSession(req);
  const updated = await markNotificationRead({ id: params.id, userId: session.userId });
  if (!updated) {
    sendJson(req, res, 404, { error: "Notification not found." });
    return;
  }
  sendJson(req, res, 200, { data: updated });
}

async function handleMarkAllRead(req, res) {
  const session = await requireSession(req);
  await markAllReadForUser(session.userId);
  sendJson(req, res, 200, { data: { ok: true } });
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

function matchPath(pathname) {
  // Phase 4F engagement — match before /api/posts/:id so suffixes win.
  const postCommentsMatch = pathname.match(/^\/api\/posts\/([^\/]+)\/comments$/);
  if (postCommentsMatch) return { handler: "post-comments", params: { id: postCommentsMatch[1] } };
  const postLikeMatch = pathname.match(/^\/api\/posts\/([^\/]+)\/like$/);
  if (postLikeMatch) return { handler: "post-like", params: { id: postLikeMatch[1] } };
  const postSaveMatch = pathname.match(/^\/api\/posts\/([^\/]+)\/save$/);
  if (postSaveMatch) return { handler: "post-save", params: { id: postSaveMatch[1] } };
  const commentLikeMatch = pathname.match(/^\/api\/comments\/([^\/]+)\/like$/);
  if (commentLikeMatch) return { handler: "comment-like", params: { id: commentLikeMatch[1] } };
  const commentIdMatch = pathname.match(/^\/api\/comments\/([^\/]+)$/);
  if (commentIdMatch) return { handler: "comment-detail", params: { id: commentIdMatch[1] } };
  const userFollowMatch = pathname.match(/^\/api\/users\/([^\/]+)\/follow$/);
  if (userFollowMatch) return { handler: "user-follow", params: { id: userFollowMatch[1] } };
  const userByUsernameMatch = pathname.match(/^\/api\/users\/by-username\/([^\/]+)$/);
  if (userByUsernameMatch) return { handler: "user-by-username", params: { username: userByUsernameMatch[1] } };

  const postIdMatch = pathname.match(/^\/api\/posts\/([^\/]+)$/);
  if (postIdMatch) return { handler: "post-detail", params: { id: postIdMatch[1] } };
  const postCloseMatch = pathname.match(/^\/api\/posts\/([^\/]+)\/close$/);
  if (postCloseMatch) return { handler: "post-close", params: { id: postCloseMatch[1] } };
  const adminPostMatch = pathname.match(/^\/api\/admin\/posts\/([^\/]+)$/);
  if (adminPostMatch) return { handler: "admin-post-action", params: { id: adminPostMatch[1] } };
  const adminUserMatch = pathname.match(/^\/api\/admin\/users\/([^\/]+)$/);
  if (adminUserMatch) return { handler: "admin-user-action", params: { id: adminUserMatch[1] } };
  const adminWithdrawalMatch = pathname.match(/^\/api\/admin\/withdrawals\/([^\/]+)$/);
  if (adminWithdrawalMatch) return { handler: "admin-withdrawal-action", params: { id: adminWithdrawalMatch[1] } };
  // Hire requests
  const hireQuoteMatch = pathname.match(/^\/api\/admin\/hire-requests\/([^\/]+)\/quote$/);
  if (hireQuoteMatch) return { handler: "admin-send-quote", params: { id: hireQuoteMatch[1] } };
  const hireCancelMatch = pathname.match(/^\/api\/admin\/hire-requests\/([^\/]+)\/cancel$/);
  if (hireCancelMatch) return { handler: "admin-cancel-hire", params: { id: hireCancelMatch[1] } };
  // Jobs
  const jobApplyMatch = pathname.match(/^\/api\/jobs\/([^\/]+)\/apply$/);
  if (jobApplyMatch) return { handler: "job-apply", params: { id: jobApplyMatch[1] } };
  const jobDetailMatch = pathname.match(/^\/api\/jobs\/([^\/]+)$/);
  if (jobDetailMatch) return { handler: "job-detail", params: { id: jobDetailMatch[1] } };
  // Admin job openings
  const adminOpeningApplicants = pathname.match(/^\/api\/admin\/job-openings\/([^\/]+)\/applicants$/);
  if (adminOpeningApplicants) return { handler: "admin-opening-applicants", params: { id: adminOpeningApplicants[1] } };
  const adminOpeningPublish = pathname.match(/^\/api\/admin\/job-openings\/([^\/]+)\/publish$/);
  if (adminOpeningPublish) return { handler: "admin-opening-publish", params: { id: adminOpeningPublish[1] } };
  const adminOpeningClose = pathname.match(/^\/api\/admin\/job-openings\/([^\/]+)\/close$/);
  if (adminOpeningClose) return { handler: "admin-opening-close", params: { id: adminOpeningClose[1] } };
  const adminOpeningId = pathname.match(/^\/api\/admin\/job-openings\/([^\/]+)$/);
  if (adminOpeningId) return { handler: "admin-opening-update", params: { id: adminOpeningId[1] } };
  const adminAppId = pathname.match(/^\/api\/admin\/applications\/([^\/]+)$/);
  if (adminAppId) return { handler: "admin-application-action", params: { id: adminAppId[1] } };
  // Notifications
  const notifReadMatch = pathname.match(/^\/api\/notifications\/([^\/]+)\/read$/);
  if (notifReadMatch) return { handler: "notification-mark-read", params: { id: notifReadMatch[1] } };
  // Reviews
  const reviewTokenMatch = pathname.match(/^\/api\/reviews\/token\/([^\/]+)$/);
  if (reviewTokenMatch) return { handler: "review-token-lookup", params: { token: reviewTokenMatch[1] } };
  const profileCanReviewMatch = pathname.match(/^\/api\/profiles\/([^\/]+)\/can-review$/);
  if (profileCanReviewMatch) return { handler: "profile-can-review", params: { userId: profileCanReviewMatch[1] } };
  const profileReviewsMatch = pathname.match(/^\/api\/profiles\/([^\/]+)\/reviews$/);
  if (profileReviewsMatch) return { handler: "profile-reviews", params: { userId: profileReviewsMatch[1] } };
  const reviewReportMatch = pathname.match(/^\/api\/reviews\/([^\/]+)\/report$/);
  if (reviewReportMatch) return { handler: "review-report", params: { id: reviewReportMatch[1] } };
  const reviewReplyMatch = pathname.match(/^\/api\/reviews\/([^\/]+)\/reply$/);
  if (reviewReplyMatch) return { handler: "review-reply", params: { id: reviewReplyMatch[1] } };
  const adminReviewMatch = pathname.match(/^\/api\/admin\/reviews\/([^\/]+)$/);
  if (adminReviewMatch) return { handler: "admin-review-action", params: { id: adminReviewMatch[1] } };
  const adminFlagMatch = pathname.match(/^\/api\/admin\/feature-flags\/([^\/]+)$/);
  if (adminFlagMatch) return { handler: "admin-feature-flag-set", params: { key: adminFlagMatch[1] } };
  // Phase 4D-2 — links + skills
  const linkIdMatch = pathname.match(/^\/api\/profile\/links\/([^\/]+)$/);
  if (linkIdMatch) return { handler: "profile-link-detail", params: { id: linkIdMatch[1] } };
  const skillIdMatch = pathname.match(/^\/api\/profile\/skills\/([^\/]+)$/);
  if (skillIdMatch) return { handler: "profile-skill-detail", params: { id: skillIdMatch[1] } };
  // Phase 4D-4 — notify-when-active + contact intent
  const notifyActiveMatch = pathname.match(/^\/api\/profiles\/([^\/]+)\/notify-when-active$/);
  if (notifyActiveMatch) return { handler: "profile-notify-when-active", params: { userId: notifyActiveMatch[1] } };
  const contactIntentMatch = pathname.match(/^\/api\/profiles\/([^\/]+)\/contact-intent$/);
  if (contactIntentMatch) return { handler: "profile-contact-intent", params: { userId: contactIntentMatch[1] } };
  // Phase 4G — help articles (public read by slug, admin CRUD by id)
  const helpSlugMatch = pathname.match(/^\/api\/help\/articles\/([^\/]+)$/);
  if (helpSlugMatch) return { handler: "help-article-detail", params: { slug: helpSlugMatch[1] } };
  const adminHelpPublishMatch = pathname.match(/^\/api\/admin\/help\/articles\/([^\/]+)\/publish$/);
  if (adminHelpPublishMatch) return { handler: "admin-help-publish", params: { id: adminHelpPublishMatch[1] } };
  const adminHelpArchiveMatch = pathname.match(/^\/api\/admin\/help\/articles\/([^\/]+)\/archive$/);
  if (adminHelpArchiveMatch) return { handler: "admin-help-archive", params: { id: adminHelpArchiveMatch[1] } };
  const adminHelpIdMatch = pathname.match(/^\/api\/admin\/help\/articles\/([^\/]+)$/);
  if (adminHelpIdMatch) return { handler: "admin-help-update", params: { id: adminHelpIdMatch[1] } };
  return null;
}

const staticGetRoutes = {
  "/api/providers": providers,
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const { pathname } = url;

    if (req.method === "OPTIONS") {
      sendJson(req, res, 200, { ok: true });
      return;
    }

    // PRD §15.4 — per-IP rate limit on every non-OPTIONS, non-/health request.
    // /health is intentionally exempt so platform health checks don't burn tokens.
    // RATE_LIMIT_DISABLED=true bypasses the limiter (default ON in dev so the
    // 391-test suite + Playwright sweeps don't trip the bucket; production
    // sets RATE_LIMIT_DISABLED=false).
    const rateLimitEnabled =
      process.env.RATE_LIMIT_DISABLED === "false"
      || (!isDev() && process.env.RATE_LIMIT_DISABLED !== "true");
    if (rateLimitEnabled && pathname !== "/health") {
      const tier = tierFor({ method: req.method, path: pathname });
      const key = `${clientIp(req)}:${tier}:${pathname}`;
      const decision = consume({ key, tier });
      res.setHeader("x-ratelimit-limit", String(TIERS[decision.tier].max));
      res.setHeader("x-ratelimit-remaining", String(Math.max(0, decision.remaining)));
      res.setHeader("x-ratelimit-reset", String(Math.floor(decision.resetAt / 1000)));
      if (!decision.allowed) {
        res.setHeader("retry-after", String(decision.retryAfterSec));
        sendJson(req, res, 429, {
          error: "Too many requests. Try again later.",
          retryAfter: decision.retryAfterSec,
        });
        return;
      }
    }

    // PRD §15.4 — CSRF double-submit enforcement on state-changing methods.
    // Skip:
    //   • safe methods (handled by sendJson which seeds the cookie),
    //   • signed webhooks (Clerk + NOWPayments have their own signature gates),
    //   • dev-only endpoints (so the test harness doesn't have to round-trip a GET),
    //   • the contact-intent silent-204 endpoint (PRD §3.4 carve-out — anonymous OK),
    //   • OTP request/verify (public endpoints called before the cookie is seeded;
    //     they're protected by the strict rate limiter + email-binding instead),
    //   • hire-request POST (public; same rationale),
    //   • reviews by-token (employer surface has no Clerk session).
    // CSRF_DISABLED=true bypasses the gate (dev default; production sets false).
    const csrfEnabled =
      process.env.CSRF_DISABLED === "false"
      || (!isDev() && process.env.CSRF_DISABLED !== "true");
    const isMutation = req.method === "POST" || req.method === "PATCH" || req.method === "DELETE";
    const isWebhook = pathname.startsWith("/api/webhooks/");
    const isDevOnly = pathname.startsWith("/api/dev/");
    const isContactIntent = /^\/api\/profiles\/[^\/]+\/contact-intent$/.test(pathname);
    const isPublicGatedByOther =
      pathname.startsWith("/api/hire-requests")
      || pathname.startsWith("/api/reviews/by-token")
      || pathname === "/api/auth/referrer/set";
    if (csrfEnabled && isMutation && !isWebhook && !isDevOnly && !isContactIntent && !isPublicGatedByOther) {
      const decision = checkCsrf({ req, subject: clientIp(req) });
      if (!decision.ok) {
        sendJson(req, res, 403, {
          error: "CSRF check failed.",
          reason: decision.reason,
        });
        return;
      }
    }

    // PRD §2.7 + Phase 8-9 — referrer cookie endpoints.
    //   GET /api/auth/referrer       → returns { ref } (reads HttpOnly cookie)
    //   POST /api/auth/referrer/set  → writes HttpOnly cookie with 30d max-age
    if (req.method === "GET" && pathname === "/api/auth/referrer") {
      const ref = readCookie(req, "ndl_ref");
      sendJson(req, res, 200, { data: { ref: ref || null } });
      return;
    }
    if (req.method === "POST" && pathname === "/api/auth/referrer/set") {
      const body = parseJsonBody(await readBody(req).catch(() => ""));
      const ref = String(body.ref || "").trim().toUpperCase();
      // PRD §2.7 cookie is 30 days. Cap length to defang any oversized payload.
      const capped = ref.slice(0, 64);
      if (!capped) {
        sendJson(req, res, 400, { error: "ref is required." });
        return;
      }
      const flags = [
        `ndl_ref=${encodeURIComponent(capped)}`,
        "Path=/",
        "Max-Age=2592000",
        "SameSite=Lax",
        "HttpOnly",
      ];
      if (!isDev()) flags.push("Secure");
      res.setHeader("set-cookie", flags.join("; "));
      sendJson(req, res, 200, { data: { ref: capped } });
      return;
    }

    if (pathname === "/health") {
      sendJson(req, res, 200, {
        ok: true,
        service: "needool-backend",
        dataProvider: env.DATA_PROVIDER,
        supabaseConfigured: Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
        clerkConfigured: Boolean(env.CLERK_SECRET_KEY),
        nowpaymentsConfigured: Boolean(env.NOWPAYMENTS_API_KEY),
        nowpaymentsBaseUrl: env.NOWPAYMENTS_BASE_URL,
        resendConfigured: Boolean(env.RESEND_API_KEY),
        adminAllowlistSize: env.ADMIN_ALLOWED_EMAILS.length,
        dev: isDev(),
      });
      return;
    }

    // Webhooks
    if (req.method === "POST" && pathname === "/api/webhooks/clerk") {
      await handleClerkWebhook(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/webhooks/nowpayments") {
      await handleNowpaymentsWebhook(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/dev/simulate-webhook") {
      await handleDevSimulateWebhook(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/dev/seed-referral-commission") {
      await wrap(handleDevSeedReferralCommission)(req, res);
      return;
    }

    // Auth + subscriptions
    if (req.method === "GET" && pathname === "/api/auth/me") {
      await wrap(handleAuthMe)(req, res);
      return;
    }
    if (req.method === "GET" && pathname === "/api/subscriptions/status") {
      await wrap(handleSubscriptionsStatus)(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/subscriptions/initiate") {
      await wrap(handleSubscriptionsInitiate)(req, res);
      return;
    }

    // Referrals + withdrawals
    if (req.method === "GET" && pathname === "/api/referrals/summary") {
      await wrap(handleReferralSummary)(req, res);
      return;
    }
    if (req.method === "GET" && pathname === "/api/referrals/commissions") {
      await wrap(handleReferralCommissions)(req, res);
      return;
    }
    if (req.method === "GET" && pathname === "/api/withdrawals") {
      await wrap(handleMyWithdrawals)(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/withdrawals") {
      await wrap(handleCreateWithdrawal)(req, res);
      return;
    }

    // Posts — user-facing
    if (req.method === "POST" && pathname === "/api/posts") {
      await wrap(handleCreatePost)(req, res);
      return;
    }
    if (req.method === "GET" && pathname === "/api/posts") {
      await wrap((q, s) => handleListPosts(q, s, url))(req, res);
      return;
    }
    if (req.method === "GET" && pathname === "/api/me/posts") {
      await wrap(handleMyPosts)(req, res);
      return;
    }
    if (req.method === "GET" && pathname === "/api/me/saves") {
      await wrap(handleMySaves)(req, res);
      return;
    }
    if (req.method === "GET" && pathname === "/api/me/follows") {
      await wrap(handleMyFollows)(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/me/onboarding-complete") {
      await wrap(handleOnboardingComplete)(req, res);
      return;
    }

    // Path-param routes
    const matched = matchPath(pathname);
    if (matched) {
      if (matched.handler === "post-detail" && req.method === "GET") {
        await wrap((q, s) => handleGetPost(q, s, url, matched.params))(req, res);
        return;
      }
      if (matched.handler === "post-close" && req.method === "PATCH") {
        await wrap((q, s) => handleClosePost(q, s, url, matched.params))(req, res);
        return;
      }
      if (matched.handler === "admin-post-action" && req.method === "PATCH") {
        await wrap(withAdminAudit(
          "post.action",
          (q, s, u, p) => handleAdminPostAction(q, s, u, p),
          { targetType: "post", buildMetadata: (body) => ({ action: body?.action, reason: body?.reason }) },
        ))(req, res, url, matched.params);
        return;
      }
      if (matched.handler === "admin-user-action" && req.method === "PATCH") {
        await wrap(withAdminAudit(
          "user.action",
          (q, s, u, p) => handleAdminUserAction(q, s, u, p),
          { targetType: "user", buildMetadata: (body) => ({ action: body?.action, reason: body?.reason, modules: body?.modules }) },
        ))(req, res, url, matched.params);
        return;
      }
      if (matched.handler === "admin-withdrawal-action" && req.method === "PATCH") {
        await wrap(withAdminAudit(
          "withdrawal.action",
          (q, s, u, p) => handleAdminWithdrawalAction(q, s, u, p),
          { targetType: "withdrawal", buildMetadata: (body) => ({ action: body?.action, txHash: body?.txHash, reason: body?.reason }) },
        ))(req, res, url, matched.params);
        return;
      }
      if (matched.handler === "admin-send-quote" && req.method === "POST") {
        await wrap(withAdminAudit(
          "hire_request.send_quote",
          (q, s, u, p) => handleAdminSendQuote(q, s, u, p),
          { targetType: "hire_request", buildMetadata: (body) => ({ amount: body?.amount, deliverables: body?.deliverables }) },
        ))(req, res, url, matched.params);
        return;
      }
      if (matched.handler === "admin-cancel-hire" && req.method === "POST") {
        await wrap(withAdminAudit(
          "hire_request.cancel",
          (q, s, u, p) => handleAdminCancelHireRequest(q, s, u, p),
          { targetType: "hire_request", buildMetadata: (body) => ({ reason: body?.reason }) },
        ))(req, res, url, matched.params);
        return;
      }
      if (matched.handler === "job-apply" && req.method === "POST") {
        await wrap((q, s) => handleApply(q, s, url, matched.params))(req, res);
        return;
      }
      if (matched.handler === "job-detail" && req.method === "GET") {
        await wrap((q, s) => handlePublicJobDetail(q, s, url, matched.params))(req, res);
        return;
      }
      if (matched.handler === "admin-opening-applicants" && req.method === "GET") {
        await wrap((q, s) => handleAdminListApplicants(q, s, url, matched.params))(req, res);
        return;
      }
      if (matched.handler === "admin-opening-publish" && req.method === "POST") {
        await wrap(withAdminAudit(
          "job_opening.publish",
          (q, s, u, p) => handleAdminPublishOpening(q, s, u, p),
          { targetType: "job_opening" },
        ))(req, res, url, matched.params);
        return;
      }
      if (matched.handler === "admin-opening-close" && req.method === "POST") {
        await wrap(withAdminAudit(
          "job_opening.close",
          (q, s, u, p) => handleAdminCloseOpening(q, s, u, p),
          { targetType: "job_opening" },
        ))(req, res, url, matched.params);
        return;
      }
      if (matched.handler === "admin-opening-update" && req.method === "PATCH") {
        await wrap(withAdminAudit(
          "job_opening.update",
          (q, s, u, p) => handleAdminUpdateJobOpening(q, s, u, p),
          {
            targetType: "job_opening",
            buildMetadata: (body) => ({
              fields: body ? Object.keys(body) : [],
              questionsCount: Array.isArray(body?.questions) ? body.questions.length : null,
            }),
          },
        ))(req, res, url, matched.params);
        return;
      }
      if (matched.handler === "admin-application-action" && req.method === "PATCH") {
        await wrap(withAdminAudit(
          "application.action",
          (q, s, u, p) => handleAdminApplicationAction(q, s, u, p),
          {
            targetType: "job_application",
            buildMetadata: (body) => ({
              action: body?.action,
              score: body?.score,
              notes: body?.notes,
            }),
          },
        ))(req, res, url, matched.params);
        return;
      }
      if (matched.handler === "review-token-lookup" && req.method === "GET") {
        await wrap((q, s) => handleReviewTokenLookup(q, s, url, matched.params))(req, res);
        return;
      }
      if (matched.handler === "notification-mark-read" && req.method === "PATCH") {
        await wrap((q, s) => handleMarkNotificationRead(q, s, url, matched.params))(req, res);
        return;
      }
      if (matched.handler === "profile-reviews") {
        if (req.method === "GET") {
          await wrap((q, s) => handleProfileReviews(q, s, url, matched.params))(req, res);
          return;
        }
        if (req.method === "POST") {
          await wrap((q, s) => handleSubmitTriggerBReview(q, s, url, matched.params))(req, res);
          return;
        }
      }
      if (matched.handler === "profile-can-review" && req.method === "GET") {
        await wrap((q, s) => handleCanReviewProfile(q, s, url, matched.params))(req, res);
        return;
      }
      if (matched.handler === "review-report" && req.method === "POST") {
        await wrap((q, s) => handleReportReview(q, s, url, matched.params))(req, res);
        return;
      }
      if (matched.handler === "review-reply" && req.method === "POST") {
        await wrap((q, s) => handleSubmitReviewReply(q, s, url, matched.params))(req, res);
        return;
      }
      if (matched.handler === "admin-review-action" && req.method === "PATCH") {
        await wrap(withAdminAudit(
          "review.action",
          (q, s) => handleAdminReviewAction(q, s, url, matched.params),
          {
            targetType: "review",
            buildMetadata: (body) => ({ action: body?.action, reason: body?.reason }),
          },
        ))(req, res, url, matched.params);
        return;
      }
      if (matched.handler === "help-article-detail" && req.method === "GET") {
        await wrap((q, s) => handleHelpDetail(q, s, url, matched.params))(req, res);
        return;
      }
      if (matched.handler === "admin-help-publish" && req.method === "POST") {
        await wrap(withAdminAudit(
          "help_article.publish",
          (q, s) => handleAdminPublishHelp(q, s, url, matched.params),
          { targetType: "help_article" },
        ))(req, res, url, matched.params);
        return;
      }
      if (matched.handler === "admin-help-archive" && req.method === "POST") {
        await wrap(withAdminAudit(
          "help_article.archive",
          (q, s) => handleAdminArchiveHelp(q, s, url, matched.params),
          { targetType: "help_article" },
        ))(req, res, url, matched.params);
        return;
      }
      if (matched.handler === "admin-help-update" && req.method === "PATCH") {
        await wrap(withAdminAudit(
          "help_article.update",
          (q, s) => handleAdminUpdateHelp(q, s, url, matched.params),
          { targetType: "help_article" },
        ))(req, res, url, matched.params);
        return;
      }
      if (matched.handler === "profile-notify-when-active" && req.method === "POST") {
        await wrap((q, s) => handleNotifyWhenActive(q, s, url, matched.params))(req, res);
        return;
      }
      if (matched.handler === "profile-contact-intent" && req.method === "POST") {
        await wrap((q, s) => handleContactIntent(q, s, url, matched.params))(req, res);
        return;
      }
      if (matched.handler === "profile-link-detail" && req.method === "DELETE") {
        await wrap((q, s) => handleRemoveLink(q, s, url, matched.params))(req, res);
        return;
      }
      if (matched.handler === "profile-skill-detail" && req.method === "DELETE") {
        await wrap((q, s) => handleRemoveSkill(q, s, url, matched.params))(req, res);
        return;
      }
      if (matched.handler === "admin-feature-flag-set" && req.method === "PATCH") {
        await wrap(withAdminAudit(
          "feature_flag.set",
          (q, s) => handleAdminSetFeatureFlag(q, s, url, matched.params),
          {
            targetType: "feature_flag",
            buildMetadata: (body) => ({ enabled: body?.enabled }),
          },
        ))(req, res, url, matched.params);
        return;
      }
      // Phase 4F engagement
      if (matched.handler === "post-comments") {
        if (req.method === "GET") {
          await wrap((q, s) => handleListComments(q, s, url, matched.params))(req, res);
          return;
        }
        if (req.method === "POST") {
          await wrap((q, s) => handleCreateComment(q, s, url, matched.params))(req, res);
          return;
        }
      }
      if (matched.handler === "post-like") {
        if (req.method === "POST") {
          await wrap((q, s) => handleLikePost(q, s, url, matched.params))(req, res);
          return;
        }
        if (req.method === "DELETE") {
          await wrap((q, s) => handleUnlikePost(q, s, url, matched.params))(req, res);
          return;
        }
      }
      if (matched.handler === "post-save") {
        if (req.method === "POST") {
          await wrap((q, s) => handleSavePost(q, s, url, matched.params))(req, res);
          return;
        }
        if (req.method === "DELETE") {
          await wrap((q, s) => handleUnsavePost(q, s, url, matched.params))(req, res);
          return;
        }
      }
      if (matched.handler === "comment-detail") {
        if (req.method === "PATCH") {
          await wrap((q, s) => handleEditComment(q, s, url, matched.params))(req, res);
          return;
        }
        if (req.method === "DELETE") {
          await wrap((q, s) => handleDeleteComment(q, s, url, matched.params))(req, res);
          return;
        }
      }
      if (matched.handler === "comment-like") {
        if (req.method === "POST") {
          await wrap((q, s) => handleLikeComment(q, s, url, matched.params))(req, res);
          return;
        }
        if (req.method === "DELETE") {
          await wrap((q, s) => handleUnlikeComment(q, s, url, matched.params))(req, res);
          return;
        }
      }
      if (matched.handler === "user-follow") {
        if (req.method === "POST") {
          await wrap((q, s) => handleFollowUser(q, s, url, matched.params))(req, res);
          return;
        }
        if (req.method === "DELETE") {
          await wrap((q, s) => handleUnfollowUser(q, s, url, matched.params))(req, res);
          return;
        }
      }
      if (matched.handler === "user-by-username" && req.method === "GET") {
        await wrap((q, s) => handleUserByUsername(q, s, url, matched.params))(req, res);
        return;
      }
    }

    // Public kind-specific feeds (alias to /api/posts?kind=)
    if (req.method === "GET" && pathname === "/api/needs") {
      await wrap((q, s) => handleFeed(q, s, url, "need"))(req, res);
      return;
    }
    if (req.method === "GET" && pathname === "/api/opportunities") {
      await wrap((q, s) => handleFeed(q, s, url, "opportunity"))(req, res);
      return;
    }
    if (req.method === "GET" && pathname === "/api/events") {
      await wrap((q, s) => handleFeed(q, s, url, "event"))(req, res);
      return;
    }

    // Hire requests (Phase 2 + Phase 6-1 OTP)
    if (req.method === "POST" && pathname === "/api/hire-requests/otp/request") {
      await wrap(handleHireRequestOtpRequest)(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/hire-requests/otp/verify") {
      await wrap(handleHireRequestOtpVerify)(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/hire-requests") {
      await wrap(handlePublicHireRequest)(req, res);
      return;
    }
    if (req.method === "GET" && pathname === "/api/admin/hire-requests") {
      await wrap((q, s) => handleAdminHireRequests(q, s, url))(req, res);
      return;
    }

    // Jobs (Phase 2 — DB-backed)
    if (req.method === "GET" && pathname === "/api/jobs") {
      await wrap(handlePublicJobsList)(req, res);
      return;
    }
    if (req.method === "GET" && pathname === "/api/me/applications") {
      await wrap(handleMyApplications)(req, res);
      return;
    }
    if (req.method === "GET" && pathname === "/api/me/verified-hires") {
      await wrap(handleMyVerifiedHires)(req, res);
      return;
    }
    if (req.method === "GET" && pathname === "/api/admin/job-openings") {
      await wrap((q, s) => handleAdminJobOpenings(q, s, url))(req, res);
      return;
    }

    // Reviews
    if (req.method === "POST" && pathname === "/api/reviews") {
      await wrap(handleSubmitApplicantReview)(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/reviews/by-token") {
      await wrap(handleSubmitEmployerReview)(req, res);
      return;
    }
    if (req.method === "GET" && pathname === "/api/employer/me") {
      await wrap((q, s) => handleEmployerAccount(q, s, url))(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/dev/expire-review-windows") {
      await wrap(handleDevExpireReviewWindows)(req, res);
      return;
    }

    // Phase 4D-5 — search & discovery (public, PRD §4.3)
    if (req.method === "GET" && pathname === "/api/search") {
      await wrap((q, s) => handleSearch(q, s, url))(req, res);
      return;
    }

    // Phase 4G — Help & Guide CMS (PRD §14)
    if (req.method === "GET" && pathname === "/api/help/articles") {
      await wrap((q, s) => handleHelpList(q, s, url))(req, res);
      return;
    }
    if (req.method === "GET" && pathname === "/api/admin/help/articles") {
      await wrap((q, s) => handleAdminHelpList(q, s, url))(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/admin/help/articles") {
      await wrap(withAdminAudit(
        "help_article.create",
        handleAdminCreateHelp,
        {
          targetType: "help_article",
          buildMetadata: (body) => ({ slug: body?.slug, title: body?.title?.slice(0, 80) }),
        },
      ))(req, res, url, null);
      return;
    }

    // Phase 4G — notification preferences (PRD §12)
    if (req.method === "GET" && pathname === "/api/notifications/preferences") {
      await wrap(handleGetNotificationPrefs)(req, res);
      return;
    }
    if (req.method === "PATCH" && pathname === "/api/notifications/preferences") {
      await wrap(handlePatchNotificationPrefs)(req, res);
      return;
    }

    // Phase 4H — push subscriptions
    if (req.method === "GET" && pathname === "/api/notifications/push/subscriptions") {
      await wrap(handleListPushSubscriptions)(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/notifications/push/subscribe") {
      await wrap(handleSubscribePush)(req, res);
      return;
    }
    if (req.method === "DELETE" && pathname === "/api/notifications/push/subscribe") {
      await wrap(handleUnsubscribePush)(req, res);
      return;
    }

    // Phase 4D-6 — SEO (PRD §4.4). Plain XML / text; no JSON wrapper.
    if (req.method === "GET" && pathname === "/sitemap.xml") {
      try { await handleSitemapXml(req, res); }
      catch (e) {
        res.writeHead(500, { "content-type": "text/plain" });
        res.end(`sitemap error: ${e.message}`);
      }
      return;
    }
    if (req.method === "GET" && pathname === "/robots.txt") {
      await handleRobotsTxt(req, res);
      return;
    }

    // Phase 4D-2 — profile composition
    if (req.method === "GET" && pathname === "/api/profile") {
      await wrap(handleGetMyProfile)(req, res);
      return;
    }
    if (req.method === "PATCH" && pathname === "/api/profile") {
      await wrap(handlePatchMyProfile)(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/profile/links") {
      await wrap(handleAddLink)(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/profile/skills") {
      await wrap(handleAddSkill)(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/profile/picture") {
      await wrap(handleUploadAvatar)(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/profile/cv") {
      await wrap(handleUploadCv)(req, res);
      return;
    }

    // Phase 4C — Trigger B admin endpoints
    if (req.method === "GET" && pathname === "/api/admin/reviews") {
      await wrap((q, s) => handleAdminListHeldReviews(q, s, url))(req, res);
      return;
    }
    if (req.method === "GET" && pathname === "/api/admin/feature-flags") {
      await wrap(handleAdminListFeatureFlags)(req, res);
      return;
    }

    // Phase 3C — subscription expiry tick
    if (req.method === "POST" && pathname === "/api/dev/run-expiry-tick") {
      await wrap(handleRunExpiryTick)(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/dev/set-subscription-expiry") {
      await wrap(handleDevSetSubscriptionExpiry)(req, res);
      return;
    }
    // Phase 4C dev helper — nudge users.active_since so eligibility tests can run
    if (req.method === "POST" && pathname === "/api/dev/set-user-active-since") {
      await wrap(handleDevSetActiveSince)(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/dev/seed-user") {
      await wrap(handleDevSeedUser)(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/dev/seed-review") {
      await wrap(handleDevSeedReview)(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/dev/signup-capture") {
      await wrap(handleDevSignupCapture)(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/dev/backdate-frequency") {
      await wrap(handleDevBackdateFreq)(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/dev/backdate-skill") {
      await wrap(handleDevBackdateSkill)(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/dev/expire-notify-sweep") {
      await wrap(handleDevExpireNotifySweep)(req, res);
      return;
    }

    // Phase 5 — content seeding
    if (req.method === "POST" && pathname === "/api/dev/seed-lagos-providers") {
      await wrap(handleDevSeedLagosProviders)(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/dev/seed-need-requests") {
      await wrap(handleDevSeedNeedRequests)(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/dev/seed-help-articles") {
      await wrap(handleDevSeedHelpArticles)(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/dev/seed-all") {
      await wrap(handleDevSeedAll)(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/dev/run-launch-qa") {
      await wrap(handleDevRunLaunchQa)(req, res);
      return;
    }

    // Notifications (Phase 3B)
    if (req.method === "GET" && pathname === "/api/notifications") {
      await wrap((q, s) => handleListNotifications(q, s, url))(req, res);
      return;
    }
    if (req.method === "GET" && pathname === "/api/notifications/unread-count") {
      await wrap(handleUnreadCount)(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/notifications/read-all") {
      await wrap(handleMarkAllRead)(req, res);
      return;
    }

    // Admin
    if (req.method === "GET" && pathname === "/api/admin/overview") {
      await wrap(handleAdminOverview)(req, res);
      return;
    }
    if (req.method === "GET" && pathname === "/api/admin/audit-log") {
      await wrap((q, s) => handleAdminAuditLog(q, s, url))(req, res);
      return;
    }
    if (req.method === "GET" && pathname === "/api/admin/users") {
      await wrap((q, s) => handleAdminUsersList(q, s, url))(req, res);
      return;
    }
    if (req.method === "GET" && pathname === "/api/admin/posts") {
      await wrap((q, s) => handleAdminPostsList(q, s, url))(req, res);
      return;
    }
    if (req.method === "POST" && pathname === "/api/admin/posts") {
      await wrap(withAdminAudit(
        "post.create",
        (q, s) => handleAdminCreatePost(q, s),
        {
          targetType: "post",
          buildMetadata: (body) => ({
            kind: body?.kind,
            title: body?.title?.slice(0, 80),
          }),
        },
      ))(req, res, url, null);
      return;
    }
    if (req.method === "GET" && pathname === "/api/admin/withdrawals") {
      await wrap((q, s) => handleAdminWithdrawals(q, s, url))(req, res);
      return;
    }

    // Static dummy GETs (kept for providers/jobs until later phases)
    if (req.method === "GET" && Object.hasOwn(staticGetRoutes, pathname)) {
      sendJson(req, res, 200, { data: staticGetRoutes[pathname], source: "dummy" });
      return;
    }

    sendJson(req, res, 404, {
      error: "Not found",
      availableEndpoints: [
        "/health",
        "/api/auth/me",
        "/api/subscriptions/status",
        "/api/subscriptions/initiate",
        "/api/webhooks/clerk",
        "/api/webhooks/nowpayments",
        isDev() ? "/api/dev/simulate-webhook" : null,
        isDev() ? "/api/dev/seed-referral-commission" : null,
        isDev() ? "/api/dev/expire-review-windows" : null,
        isDev() ? "/api/dev/seed-lagos-providers" : null,
        isDev() ? "/api/dev/seed-need-requests" : null,
        isDev() ? "/api/dev/seed-help-articles" : null,
        isDev() ? "/api/dev/seed-all" : null,
        isDev() ? "/api/dev/run-launch-qa" : null,
        "/api/referrals/summary",
        "/api/referrals/commissions",
        "/api/withdrawals",
        "/api/posts",
        "/api/posts/:id",
        "/api/posts/:id/close (PATCH)",
        "/api/me/posts",
        "/api/me/applications",
        "/api/me/verified-hires",
        "/api/me/onboarding-complete (POST)",
        "/api/needs",
        "/api/opportunities",
        "/api/events",
        "/api/hire-requests (POST)",
        "/api/hire-requests/otp/request (POST)",
        "/api/hire-requests/otp/verify (POST)",
        "/api/jobs",
        "/api/jobs/:id",
        "/api/jobs/:id/apply (POST)",
        "/api/reviews (POST)",
        "/api/reviews/:id/reply (POST)",
        "/api/reviews/token/:token",
        "/api/reviews/by-token (POST)",
        "/api/employer/me?token=… (GET)",
        "/api/profiles/:userId/reviews",
        "/api/admin/overview",
        "/api/admin/users",
        "/api/admin/users/:id (PATCH)",
        "/api/admin/posts?status=&kind=",
        "/api/admin/posts/:id (PATCH)",
        "/api/admin/withdrawals",
        "/api/admin/withdrawals/:id (PATCH)",
        "/api/admin/hire-requests",
        "/api/admin/hire-requests/:id/quote (POST)",
        "/api/admin/hire-requests/:id/cancel (POST)",
        "/api/admin/job-openings",
        "/api/admin/job-openings/:id (PATCH)",
        "/api/admin/job-openings/:id/publish (POST)",
        "/api/admin/job-openings/:id/close (POST)",
        "/api/admin/job-openings/:id/applicants",
        "/api/admin/applications/:id (PATCH)",
        ...Object.keys(staticGetRoutes),
      ].filter(Boolean),
    });
  } catch (error) {
    console.error(error);
    sendJson(req, res, 500, {
      error: "Backend request failed.",
      detail: isDev() ? error.message : undefined,
    });
  }
});

server.listen(env.PORT, () => {
  console.log(`Needool backend listening on http://localhost:${env.PORT}`);
  if (!env.CLERK_SECRET_KEY) console.warn("[warn] CLERK_SECRET_KEY missing — auth endpoints will reject.");
  if (!env.NOWPAYMENTS_API_KEY) console.warn("[warn] NOWPAYMENTS_API_KEY missing — subscriptions/initiate will fail.");
  if (!env.SUPABASE_URL) console.warn("[warn] SUPABASE_URL missing — data layer will fail.");
});
