const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? "";
const AUTH_PAGE_MODE = import.meta.env.VITE_CLERK_AUTH_PAGE_MODE ?? "hosted";
const ACCOUNT_PORTAL_BASE_URL = import.meta.env.VITE_CLERK_ACCOUNT_PORTAL_BASE_URL ?? "";
const ACCOUNT_PORTAL_SIGN_IN_URL = import.meta.env.VITE_CLERK_ACCOUNT_PORTAL_SIGN_IN_URL ?? "";
const ACCOUNT_PORTAL_SIGN_UP_URL = import.meta.env.VITE_CLERK_ACCOUNT_PORTAL_SIGN_UP_URL ?? "";

export type ClerkAuthKind = "sign-in" | "sign-up";

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
}

export function getClerkFrontendApiHost() {
  const keyBody = PUBLISHABLE_KEY.replace(/^pk_(test|live)_/, "");
  if (!keyBody || keyBody === PUBLISHABLE_KEY) return null;

  try {
    const decoded = decodeBase64Url(keyBody);
    const host = decoded.split("$")[0]?.trim();
    return host || null;
  } catch {
    return null;
  }
}

export function shouldUseEmbeddedClerk(searchEmbedded?: string) {
  return AUTH_PAGE_MODE === "embedded" || searchEmbedded === "1" || searchEmbedded === "true";
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function getExplicitPortalUrl(kind: ClerkAuthKind) {
  const exactUrl = kind === "sign-in" ? ACCOUNT_PORTAL_SIGN_IN_URL : ACCOUNT_PORTAL_SIGN_UP_URL;
  if (exactUrl && /^https?:\/\//i.test(exactUrl)) return exactUrl;
  if (!ACCOUNT_PORTAL_BASE_URL || !/^https?:\/\//i.test(ACCOUNT_PORTAL_BASE_URL)) return null;
  return `${normalizeBaseUrl(ACCOUNT_PORTAL_BASE_URL)}/${kind}`;
}

export function getExplicitClerkHostedAuthUrl(kind: ClerkAuthKind) {
  const explicitUrl = getExplicitPortalUrl(kind);
  if (!explicitUrl || typeof window === "undefined") return null;

  const url = new URL(explicitUrl);
  const dashboardUrl = `${window.location.origin}/dashboard`;
  url.searchParams.set("sign_in_force_redirect_url", dashboardUrl);
  url.searchParams.set("sign_up_force_redirect_url", dashboardUrl);
  url.searchParams.set("sign_in_fallback_redirect_url", dashboardUrl);
  url.searchParams.set("sign_up_fallback_redirect_url", dashboardUrl);
  return url.toString();
}

export function getClerkAuthDiagnostics() {
  const host = getClerkFrontendApiHost();
  return {
    mode: AUTH_PAGE_MODE,
    hasPublishableKey: Boolean(PUBLISHABLE_KEY),
    frontendApiHost: host,
    redirectStrategy: ACCOUNT_PORTAL_BASE_URL ? "explicit-hard-redirect" : "clerk-sdk",
    hasAccountPortalBaseUrl: Boolean(ACCOUNT_PORTAL_BASE_URL),
    hasExplicitSignInUrl: Boolean(ACCOUNT_PORTAL_SIGN_IN_URL),
    hasExplicitSignUpUrl: Boolean(ACCOUNT_PORTAL_SIGN_UP_URL),
  };
}
