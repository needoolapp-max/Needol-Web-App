const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? "";
const AUTH_PAGE_MODE = import.meta.env.VITE_CLERK_AUTH_PAGE_MODE ?? "hosted";
const EXPLICIT_SIGN_IN_URL = import.meta.env.VITE_CLERK_ACCOUNT_PORTAL_SIGN_IN_URL ?? "";
const EXPLICIT_SIGN_UP_URL = import.meta.env.VITE_CLERK_ACCOUNT_PORTAL_SIGN_UP_URL ?? "";

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

function getExplicitUrl(kind: ClerkAuthKind) {
  const value = kind === "sign-in" ? EXPLICIT_SIGN_IN_URL : EXPLICIT_SIGN_UP_URL;
  if (!value || !/^https?:\/\//i.test(value)) return null;
  return value;
}

export function shouldUseEmbeddedClerk(searchEmbedded?: string) {
  return AUTH_PAGE_MODE === "embedded" || searchEmbedded === "1" || searchEmbedded === "true";
}

export function getClerkHostedAuthUrl(kind: ClerkAuthKind) {
  const explicitUrl = getExplicitUrl(kind);
  const host = getClerkFrontendApiHost();
  const base = explicitUrl ?? (host ? `https://${host}/${kind}` : null);
  if (!base) return null;

  const url = new URL(base);
  const redirectUrl = `${window.location.origin}/dashboard`;
  url.searchParams.set("redirect_url", redirectUrl);
  url.searchParams.set("after_sign_in_url", redirectUrl);
  url.searchParams.set("after_sign_up_url", redirectUrl);
  return url.toString();
}

export function getClerkAuthDiagnostics() {
  const host = getClerkFrontendApiHost();
  return {
    mode: AUTH_PAGE_MODE,
    hasPublishableKey: Boolean(PUBLISHABLE_KEY),
    frontendApiHost: host,
    hasExplicitSignInUrl: Boolean(EXPLICIT_SIGN_IN_URL),
    hasExplicitSignUpUrl: Boolean(EXPLICIT_SIGN_UP_URL),
  };
}
