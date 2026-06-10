import { selectOne, insertRow, updateRows, upsertRow } from "./supabase.mjs";

function deriveUsername(email, fallbackName) {
  const source = (email || fallbackName || "").split("@")[0] || "";
  const slug = source.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (slug.length >= 2) return slug.slice(0, 30);
  return `user${Math.floor(Math.random() * 100000)}`;
}

function deriveReferralCode(username) {
  return (
    username.toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 30)
    || `USER-${Date.now()}`
  );
}

export function avatarFor(email, username) {
  const seed = encodeURIComponent(email || username || `u${Date.now()}`);
  return `https://i.pravatar.cc/200?u=${seed}`;
}

export async function findUserById(id) {
  return selectOne("users", `id=eq.${encodeURIComponent(id)}&select=*`);
}

export async function findUserByUsername(username) {
  if (!username) return null;
  return selectOne(
    "users",
    `username=eq.${encodeURIComponent(String(username).toLowerCase())}&select=*`,
  );
}

export async function findUserByEmail(email) {
  return selectOne("users", `email=eq.${encodeURIComponent(email.toLowerCase())}&select=*`);
}

export async function findUserByReferralCode(referralCode) {
  return selectOne(
    "users",
    `referral_code=eq.${encodeURIComponent(String(referralCode || "").toUpperCase())}&select=*`,
  );
}

export async function findUserByReferralKey(referralKey) {
  const raw = String(referralKey || "").trim();
  if (!raw) return null;
  const byCode = await findUserByReferralCode(raw);
  if (byCode) return byCode;
  return selectOne(
    "users",
    `username=eq.${encodeURIComponent(raw.toLowerCase())}&select=*`,
  );
}

export async function listUsersByReferrerCode(referralCode) {
  const { selectMany } = await import("./supabase.mjs");
  return selectMany(
    "users",
    `referred_by=eq.${encodeURIComponent(String(referralCode || "").toUpperCase())}&select=id,username,name,email,status,created_at,avatar&order=created_at.desc`,
  );
}

export async function listUsersByReferrerKeys(referralKeys) {
  const keys = [...new Set(
    referralKeys
      .map((key) => String(key || "").trim().toUpperCase())
      .filter(Boolean),
  )];
  const batches = await Promise.all(keys.map((key) => listUsersByReferrerCode(key)));
  const seen = new Set();
  return batches.flat().filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

export async function ensureUniqueUsername(base) {
  let candidate = base;
  let attempt = 0;
  while (await selectOne("users", `username=eq.${encodeURIComponent(candidate)}&select=id`)) {
    attempt += 1;
    candidate = `${base.slice(0, 27)}${attempt}`;
    if (attempt > 50) {
      candidate = `${base.slice(0, 22)}${Date.now().toString().slice(-6)}`;
      break;
    }
  }
  return candidate;
}

export async function upsertUserFromClerk(clerkUser, options = {}) {
  const {
    referredBy = null,
    referredByCookie = null,
    accountType = "Individual",
    individual = null,
    business = null,
  } = options;
  const email = (
    clerkUser.email_addresses?.find((e) => e.id === clerkUser.primary_email_address_id)?.email_address
    || clerkUser.email_addresses?.[0]?.email_address
    || clerkUser.primaryEmailAddress?.emailAddress
    || ""
  ).toLowerCase();
  const name = [clerkUser.first_name, clerkUser.last_name].filter(Boolean).join(" ").trim()
    || clerkUser.username
    || email.split("@")[0]
    || "Needool user";

  const existing = email ? await findUserByEmail(email) : null;
  if (existing) {
    await updateRows("users", `id=eq.${encodeURIComponent(existing.id)}`, {
      email,
      name,
      avatar: clerkUser.image_url || existing.avatar || avatarFor(email, existing.username),
    });
    return findUserById(existing.id);
  }

  const baseUsername = deriveUsername(email, name);
  const username = await ensureUniqueUsername(baseUsername);
  const referralCode = deriveReferralCode(username);

  // PRD §2.7 — typed wins on conflict; non-existent code silent-drops.
  const resolvedReferrer = await resolveReferrerCode({ typed: referredBy, cookie: referredByCookie });

  const row = {
    id: clerkUser.id,
    email,
    name,
    username,
    account_type: accountType === "Business" ? "Business" : "Individual",
    status: "inactive",
    referral_code: referralCode,
    referred_by: resolvedReferrer,
    profile_complete: false,
    avatar: clerkUser.image_url || avatarFor(email, username),
    notifications: resolvedReferrer
      ? [`Welcome. Referral code ${resolvedReferrer} was applied at signup.`]
      : ["Welcome to Needool. Share your referral code to invite others."],
    // PRD §2.3 — Individual signup fields. Caller has already run them through
    // pickIndividualSignup in lib/signup.mjs.
    ...(accountType === "Individual" && individual ? individual : {}),
    // PRD §2.4 — Business signup fields.
    ...(accountType === "Business" && business ? business : {}),
  };

  await upsertRow("users", row, "id");
  return findUserById(clerkUser.id);
}

// PRD §2.7 — resolve a referrer code, with silent-drop on non-existent.
// Returns the uppercased canonical code or null.
export async function resolveReferrerCode({ typed, cookie }) {
  const t = typed ? String(typed).toUpperCase() : null;
  const c = cookie ? String(cookie).toUpperCase() : null;
  if (t) {
    const user = await findUserByReferralCode(t);
    return user ? t : null; // silent-drop per §2.7
  }
  if (c) {
    const user = await findUserByReferralCode(c);
    return user ? c : null;
  }
  return null;
}

export async function softDeleteUser(userId) {
  await updateRows("users", `id=eq.${encodeURIComponent(userId)}`, {
    deleted_at: new Date().toISOString(),
  });
}

export async function activateUser(userId) {
  const current = await findUserById(userId);
  const wasInactive = !current || current.status !== "active";
  const patch = { status: "active" };
  if (wasInactive || !current?.active_since) {
    patch.active_since = new Date().toISOString();
  }
  await updateRows("users", `id=eq.${encodeURIComponent(userId)}`, patch);
  // PRD §3.3 — fan out any pending notify-when-active requests targeting
  // this user. Lazy import to avoid a cycle (notify-active-store imports
  // users.findUserById).
  if (wasInactive) {
    try {
      const mod = await import("./notify-active-store.mjs");
      await mod.fanoutOnTargetActivation({ targetUserId: userId });
    } catch (e) {
      console.warn(`[users.activateUser] notify-active fanout failed: ${e.message}`);
    }
  }
}

export async function deactivateUser(userId) {
  await updateRows("users", `id=eq.${encodeURIComponent(userId)}`, {
    status: "inactive",
    active_since: null,
  });
}

export async function appendUserNotification(userId, message) {
  const user = await findUserById(userId);
  if (!user) return null;
  const notifications = Array.isArray(user.notifications) ? user.notifications : [];
  await updateRows("users", `id=eq.${encodeURIComponent(userId)}`, {
    notifications: [String(message), ...notifications].slice(0, 100),
  });
  return findUserById(userId);
}

export function publicUserShape(row, subscription = null) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    avatar: row.avatar || avatarFor(row.email, row.username),
    accountType: row.account_type,
    profileComplete: Boolean(row.profile_complete),
    // Phase 9 — derived from the demographic signup fields being non-empty.
    // Distinct from profile_complete (PRD §3.1 + §8.4 — job-apply readiness:
    // bio + skills + CV). Onboarding = "captured the §2.3 / §2.4 fields";
    // profile-complete = "ready to apply for jobs". The frontend dashboard
    // gate (Phase 9-4) checks onboardingComplete, not profile_complete.
    onboardingComplete: Boolean(row.country && row.city && row.phone),
    status: row.status || "inactive",
    moduleRestrictions: Array.isArray(row.module_restrictions)
      ? row.module_restrictions
      : [],
    activeSince: row.active_since ?? null,
    // PRD §2.3 / §2.4 — signup demographics + contact.
    firstName: row.first_name ?? null,
    middleName: row.middle_name ?? null,
    lastName: row.last_name ?? null,
    sex: row.sex ?? null,
    nationality: row.nationality ?? null,
    dateOfBirth: row.date_of_birth ?? null,
    phone: row.phone ?? null,
    whatsapp: row.whatsapp ?? null,
    country: row.country ?? null,
    state: row.state ?? null,
    city: row.city ?? null,
    businessAddress: row.business_address ?? null,
    officeType: row.office_type ?? null,
    hqAddress: row.hq_address ?? null,
    hqCountry: row.hq_country ?? null,
    hqState: row.hq_state ?? null,
    hqCity: row.hq_city ?? null,
    // PRD §3.1 profile composition
    bio: row.bio ?? null,
    locationLat: row.location_lat ?? null,
    locationLng: row.location_lng ?? null,
    remote: row.remote ?? false,
    hourlyRate: row.hourly_rate ?? null,
    currency: row.currency ?? null,
    workHours: row.work_hours ?? null,
    profilePicturePath: row.profile_picture_path ?? null,
    cvPath: row.cv_path ?? null,
    cvExtractedTextLength: row.cv_extracted_text ? row.cv_extracted_text.length : 0,
    // PRD §2.6 frequency-limit stamps (so the UI can show "next change in N days")
    phoneUpdatedAt: row.phone_updated_at ?? null,
    whatsappUpdatedAt: row.whatsapp_updated_at ?? null,
    locationUpdatedAt: row.location_updated_at ?? null,
    gpsUpdatedAt: row.gps_updated_at ?? null,
    bannedReason: row.banned_reason ?? null,
    restrictedReason: row.restricted_reason ?? null,
    referralCode: row.referral_code,
    referredBy: row.referred_by,
    referrals: [],
    notifications: Array.isArray(row.notifications) ? row.notifications : [],
    subscription: subscription
      ? {
          status: subscription.status,
          plan: subscription.plan,
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end,
          trialEndAt: subscription.trial_end_at,
        }
      : null,
  };
}

export async function listUsersForAdmin({ q, status, limit = 100 } = {}) {
  const { selectMany } = await import("./supabase.mjs");
  const params = new URLSearchParams();
  params.set("select", "*");
  if (status) params.set("status", `eq.${status}`);
  if (q) {
    // Supabase PostgREST `or` filter on email/username/name.
    const term = `*${q}*`;
    params.set("or", `(email.ilike.${term},username.ilike.${term},name.ilike.${term})`);
  }
  params.set("order", "created_at.desc");
  params.set("limit", String(limit));
  return selectMany("users", params.toString());
}
