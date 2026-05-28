const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? "";
const AUTH_PAGE_MODE = import.meta.env.VITE_CLERK_AUTH_PAGE_MODE ?? "hosted";

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

export function getClerkAuthDiagnostics() {
  const host = getClerkFrontendApiHost();
  return {
    mode: AUTH_PAGE_MODE,
    hasPublishableKey: Boolean(PUBLISHABLE_KEY),
    frontendApiHost: host,
    redirectStrategy: "clerk-sdk",
  };
}
