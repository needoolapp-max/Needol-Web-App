import http from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClerkClient, verifyToken } from "@clerk/backend";

const PORT = Number(process.env.PORT || 4100);
const DATA_PATH = join(dirname(fileURLToPath(import.meta.url)), "data", "store.json");
const DATA_PROVIDER = process.env.DATA_PROVIDER || "local";
const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_STATE_TABLE = process.env.SUPABASE_STATE_TABLE || "needool_app_state";
const SUPABASE_STATE_KEY = process.env.SUPABASE_STATE_KEY || "dummy_store";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Needool <hello@needool.local>";
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || "";
const CLERK_FRONTEND_SECRET_KEY = process.env.CLERK_FRONTEND_SECRET_KEY || "";
const ADMIN_ALLOWED_EMAILS = (process.env.ADMIN_ALLOWED_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);
const clerkClient = CLERK_SECRET_KEY ? createClerkClient({ secretKey: CLERK_SECRET_KEY }) : null;
const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3200",
  "http://127.0.0.1:3200",
];
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS.join(","))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const seedUsers = [
  {
    id: "u_ada",
    name: "Ada Okafor",
    username: "ada.codes",
    email: "ada@needool.local",
    password: "password",
    accountType: "Individual",
    status: "active",
    referralCode: "ADA-CODES",
    referredBy: null,
    referrals: [],
    notifications: ["Your referral code ADA-CODES is active."],
    createdAt: "2026-05-01T09:00:00.000Z",
  },
  {
    id: "u_kemi",
    name: "Kemi Adebayo",
    username: "kemi.designs",
    email: "kemi@needool.local",
    password: "password",
    accountType: "Individual",
    status: "active",
    referralCode: "KEMI-DESIGNS",
    referredBy: "ADA-CODES",
    referrals: [],
    notifications: ["Ada's referral was applied at signup."],
    createdAt: "2026-05-02T09:00:00.000Z",
  },
  {
    id: "u_fixit",
    name: "FixIt Lagos",
    username: "fixit.lagos",
    email: "fixit@needool.local",
    password: "password",
    accountType: "Business",
    status: "active",
    referralCode: "FIXIT-LAGOS",
    referredBy: null,
    referrals: [],
    notifications: ["Your business referral code FIXIT-LAGOS is active."],
    createdAt: "2026-05-03T09:00:00.000Z",
  },
];

const providers = [
  { id: "p1", username: "ada.codes", name: "Ada Okafor", status: "active", city: "Ikeja", country: "Nigeria", skills: ["React", "TypeScript", "UI Design"] },
  { id: "p2", username: "kemi.designs", name: "Kemi Adebayo", status: "active", city: "Lekki", country: "Nigeria", skills: ["Brand Design", "Figma"] },
  { id: "p3", username: "fixit.lagos", name: "FixIt Lagos", status: "active", city: "Surulere", country: "Nigeria", skills: ["AC Service", "Appliance Repair"] },
];

const needs = [
  { id: "n1", title: "React dashboard build", status: "approved", scope: "Remote", budget: "USD 1,500 - 2,500" },
  { id: "n2", title: "Emergency plumber in Lekki", status: "pending", scope: "Lagos", budget: "Negotiable" },
];

const opportunities = [
  { id: "o1", title: "Lagos creator grant", status: "approved", scope: "Nigeria", deadline: "2026-06-30" },
  { id: "o2", title: "Remote climate fellowship", status: "approved", scope: "Worldwide", deadline: "2026-07-14" },
];

const events = [
  { id: "e1", title: "Needool Lagos provider clinic", type: "Physical", status: "open", location: "Yaba, Lagos" },
  { id: "e2", title: "Winning verified hire profiles", type: "Online", status: "open", location: "Worldwide" },
];

const jobs = [
  { id: "j1", title: "Frontend Engineer", status: "open", applicantCount: 18, feeStatus: "paid" },
  { id: "j2", title: "Operations Associate", status: "draft", applicantCount: 0, feeStatus: "quote_sent" },
];

function publicUser(user) {
  if (!user) return null;
  const { password, clerkId, ...safe } = user;
  return {
    ...safe,
    avatar: user.avatar || `https://i.pravatar.cc/200?u=${encodeURIComponent(user.username)}`,
  };
}

function createInitialStore() {
  const users = seedUsers.map((user) => ({ ...user }));
  const ada = users.find((user) => user.referralCode === "ADA-CODES");
  const kemi = users.find((user) => user.username === "kemi.designs");
  ada.referrals.push({
    userId: kemi.id,
    username: kemi.username,
    name: kemi.name,
    joinedAt: kemi.createdAt,
    status: "active",
  });
  return {
    users,
    adminEvents: [
      { id: "evt_seed_1", type: "registration", message: "Kemi Adebayo registered using ADA-CODES.", createdAt: "2026-05-02T09:00:00.000Z" },
    ],
  };
}

function loadLocalStore() {
  if (!existsSync(DATA_PATH)) {
    const initial = createInitialStore();
    saveLocalStore(initial);
    return initial;
  }
  return JSON.parse(readFileSync(DATA_PATH, "utf8"));
}

function saveLocalStore(store) {
  mkdirSync(dirname(DATA_PATH), { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(store, null, 2));
}

async function supabaseRequest(path, init = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase is selected but SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.");
  }
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase request failed: ${response.status} ${text}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function loadSupabaseStore() {
  const rows = await supabaseRequest(`${SUPABASE_STATE_TABLE}?select=payload&key=eq.${encodeURIComponent(SUPABASE_STATE_KEY)}`);
  if (rows?.[0]?.payload) return rows[0].payload;

  const initial = createInitialStore();
  await saveSupabaseStore(initial);
  return initial;
}

async function saveSupabaseStore(store) {
  await supabaseRequest(`${SUPABASE_STATE_TABLE}?on_conflict=key`, {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ key: SUPABASE_STATE_KEY, payload: store }),
  });
}

async function loadStore() {
  if (DATA_PROVIDER === "supabase") return loadSupabaseStore();
  return loadLocalStore();
}

async function saveStore(store) {
  if (DATA_PROVIDER === "supabase") {
    await saveSupabaseStore(store);
    return;
  }
  saveLocalStore(store);
}

function normalizeReferralCode(value) {
  return String(value || "").trim().toUpperCase();
}

function makeReferralCode(username) {
  return username.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toUpperCase() || `USER-${Date.now()}`;
}

function getCorsOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return ALLOWED_ORIGINS[0] || "null";
  if (ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin)) return origin;
  return "null";
}

function sendJson(req, res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": getCorsOrigin(req),
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "authorization,content-type",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "strict-transport-security": "max-age=63072000; includeSubDomains",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    "vary": "Origin",
  });
  res.end(body);
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");
  return type?.toLowerCase() === "bearer" ? token : "";
}

function getUserEmails(user) {
  return (user?.emailAddresses || [])
    .map((item) => item.emailAddress?.toLowerCase())
    .filter(Boolean);
}

async function requireAdmin(req, res) {
  if (!CLERK_SECRET_KEY || !clerkClient || ADMIN_ALLOWED_EMAILS.length === 0) {
    sendJson(req, res, 403, { error: "Admin auth is not configured." });
    return null;
  }

  const token = getBearerToken(req);
  if (!token) {
    sendJson(req, res, 401, { error: "Admin sign-in required." });
    return null;
  }

  try {
    const payload = await verifyToken(token, { secretKey: CLERK_SECRET_KEY });
    const user = await clerkClient.users.getUser(payload.sub);
    const emails = getUserEmails(user);
    const allowedEmail = emails.find((email) => ADMIN_ALLOWED_EMAILS.includes(email));

    if (!allowedEmail) {
      sendJson(req, res, 403, { error: "This account is not allowed to access admin data." });
      return null;
    }

    return { userId: payload.sub, email: allowedEmail };
  } catch {
    sendJson(req, res, 401, { error: "Invalid or expired admin session." });
    return null;
  }
}

async function requireFrontendUser(req, res) {
  if (!CLERK_FRONTEND_SECRET_KEY) {
    sendJson(req, res, 503, { error: "Frontend auth is not configured on this server." });
    return null;
  }
  const token = getBearerToken(req);
  if (!token) {
    sendJson(req, res, 401, { error: "Sign-in required." });
    return null;
  }
  try {
    return await verifyToken(token, { secretKey: CLERK_FRONTEND_SECRET_KEY });
  } catch {
    sendJson(req, res, 401, { error: "Invalid or expired session." });
    return null;
  }
}

async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) return { skipped: true, reason: "RESEND_API_KEY is not configured." };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ from: RESEND_FROM_EMAIL, to, subject, html }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Resend request failed: ${response.status} ${text}`);
  }
  return response.json();
}

function readBody(req, maxBytes = 102_400) {
  return new Promise((resolve, reject) => {
    let body = "";
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        req.destroy();
        reject(new Error("Request body too large."));
        return;
      }
      body += chunk;
    });
    req.on("end", () => resolve(body));
  });
}

async function readJson(req) {
  const raw = await readBody(req);
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const _rateMap = new Map();
function rateLimit(ip, max = 8, windowMs = 60_000) {
  const now = Date.now();
  const entry = _rateMap.get(ip) ?? { count: 0, reset: now + windowMs };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + windowMs; }
  entry.count++;
  _rateMap.set(ip, entry);
  return entry.count <= max;
}
function getIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
}

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{0,28}[a-z0-9]$|^[a-z0-9]{1,30}$/;
function isValidUsername(u) { return USERNAME_RE.test(u) && !/[._-]{2}/.test(u); }

function sanitizeAvatar(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? url.slice(0, 500) : "";
  } catch { return ""; }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    if (req.method === "OPTIONS") {
      sendJson(req, res, 200, { ok: true });
      return;
    }

    if (url.pathname === "/health") {
      sendJson(req, res, 200, {
        ok: true,
        service: "needool-backend",
        dataProvider: DATA_PROVIDER,
        supabaseConfigured: Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY),
        resendConfigured: Boolean(RESEND_API_KEY),
        adminAuthConfigured: Boolean(CLERK_SECRET_KEY && ADMIN_ALLOWED_EMAILS.length),
        frontendAuthConfigured: Boolean(CLERK_FRONTEND_SECRET_KEY),
        apiKeysRequired: false,
      });
      return;
    }

    const store = await loadStore();

  if (["/api/auth/signup", "/api/auth/login", "/api/auth/session"].includes(url.pathname)) {
    sendJson(req, res, 410, { error: "This endpoint has been removed. Authentication is handled by Clerk." });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/auth/sync") {
    const payload = await requireFrontendUser(req, res);
    if (!payload) return;
    const user = store.users.find((u) => u.clerkId === payload.sub);
    if (!user) {
      sendJson(req, res, 200, { needsOnboarding: true });
      return;
    }
    sendJson(req, res, 200, { user: publicUser(user) });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/register") {
    if (!rateLimit(getIp(req), 6, 60_000)) {
      sendJson(req, res, 429, { error: "Too many requests. Please wait a moment and try again." });
      return;
    }

    const payload = await requireFrontendUser(req, res);
    if (!payload) return;

    const existing = store.users.find((u) => u.clerkId === payload.sub);
    if (existing) {
      sendJson(req, res, 200, { user: publicUser(existing) });
      return;
    }

    const body = await readJson(req);
    const name = String(body.name || "").trim().slice(0, 100);
    const username = String(body.username || "").trim().toLowerCase().slice(0, 30);
    const email = String(body.email || "").trim().toLowerCase().slice(0, 255);
    const avatar = sanitizeAvatar(String(body.avatar || ""));
    const accountType = body.accountType === "Business" ? "Business" : "Individual";
    const referralInput = normalizeReferralCode(String(body.referralCode || "").slice(0, 50));

    if (!name || !username || !email) {
      sendJson(req, res, 400, { error: "Name, username, and email are required." });
      return;
    }
    if (!isValidUsername(username)) {
      sendJson(req, res, 400, { error: "Username must be 2–30 characters and may only contain letters, numbers, dots, hyphens, and underscores." });
      return;
    }
    if (!email.includes("@") || !email.includes(".")) {
      sendJson(req, res, 400, { error: "A valid email address is required." });
      return;
    }
    if (store.users.some((u) => u.username === username)) {
      sendJson(req, res, 409, { error: "That username is already taken." });
      return;
    }
    if (store.users.some((u) => u.email === email && u.clerkId !== payload.sub)) {
      sendJson(req, res, 409, { error: "That email is already registered." });
      return;
    }

    const now = new Date().toISOString();
    const referralCode = makeReferralCode(username);
    const referrer = referralInput
      ? store.users.find((u) => normalizeReferralCode(u.referralCode) === referralInput || u.username.toUpperCase() === referralInput)
      : null;

    const newUser = {
      id: `u_${Date.now()}`,
      clerkId: payload.sub,
      name,
      username,
      email,
      avatar,
      accountType,
      status: referrer ? "active" : "inactive",
      referralCode,
      referredBy: referrer?.referralCode ?? null,
      referrals: [],
      notifications: [
        referrer
          ? `Welcome. Referral code ${referrer.referralCode} was applied and your account is active.`
          : "Welcome to Needool. Share your referral code to activate your account.",
      ],
      createdAt: now,
    };

    if (referrer) {
      referrer.referrals.push({ userId: newUser.id, username, name, joinedAt: now, status: newUser.status });
      referrer.notifications.push(`${name} registered using your referral code ${referrer.referralCode}.`);
    }

    store.users.push(newUser);
    store.adminEvents.unshift({
      id: `evt_${Date.now()}`,
      type: referrer ? "referral_registration" : "registration",
      message: referrer
        ? `${name} registered using ${referrer.referralCode} from ${referrer.username}.`
        : `${name} registered without a referral code.`,
      createdAt: now,
    });
    await saveStore(store);

    await sendEmail({
      to: email,
      subject: "Welcome to Needool",
      html: `<p>Welcome ${name}. Thanks for joining Needool!</p>`,
    }).catch((error) => {
      console.warn("Resend email skipped or failed:", error.message);
    });

    sendJson(req, res, 201, { user: publicUser(newUser) });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/overview") {
    if (!(await requireAdmin(req, res))) return;
    sendJson(req, res, 200, {
      data: {
        users: store.users.length,
        activeSubscribers: store.users.filter((user) => user.status === "active").length,
        pendingApprovals: 17,
        revenueMtd: 2840,
        withdrawalsPending: 4,
        triggerBEnabled: true,
        newRegistrations: store.adminEvents.length,
        referralRegistrations: store.adminEvents.filter((event) => event.type === "referral_registration").length,
      },
      source: DATA_PROVIDER,
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/users") {
    if (!(await requireAdmin(req, res))) return;
    sendJson(req, res, 200, { data: store.users.map(publicUser), source: DATA_PROVIDER });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/events") {
    if (!(await requireAdmin(req, res))) return;
    sendJson(req, res, 200, { data: store.adminEvents, source: DATA_PROVIDER });
    return;
  }

  const getRoutes = {
    "/api/providers": providers,
    "/api/needs": needs,
    "/api/opportunities": opportunities,
    "/api/events": events,
    "/api/jobs": jobs,
  };

  if (req.method === "GET" && Object.hasOwn(getRoutes, url.pathname)) {
    sendJson(req, res, 200, { data: getRoutes[url.pathname], source: "dummy" });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/mock-checkout") {
    const payload = await readJson(req);
    sendJson(req, res, 201, {
      checkoutId: `dummy_checkout_${Date.now()}`,
      status: "created",
      provider: "NowPayments placeholder",
      amountUsd: payload.amountUsd || 2,
      paymentLink: "https://example.com/dummy-nowpayments-checkout",
    });
    return;
  }

  sendJson(req, res, 404, {
    error: "Not found",
    availableEndpoints: Object.keys(getRoutes).concat([
      "/health",
      "/api/auth/sync",
      "/api/auth/register",
      "/api/admin/overview",
      "/api/admin/users",
      "/api/admin/events",
      "/api/mock-checkout",
    ]),
  });
  } catch (error) {
    console.error(error);
    sendJson(req, res, 500, { error: "Backend request failed.", detail: process.env.NODE_ENV === "production" ? undefined : error.message });
  }
});

server.listen(PORT, () => {
  console.log(`Needool dummy backend running at http://localhost:${PORT}`);
});
