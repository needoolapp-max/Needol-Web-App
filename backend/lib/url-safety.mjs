// Phase 8-8 — SSRF-safe URL validator for user-supplied links.
//
// OWASP 2026 folded SSRF into A01 Broken Access Control. PRD §3.1 lets
// users paste up to 7–15 link URLs on their profile + evidence URLs on
// reviews + CVs. Today we only STORE these. The moment we add server-side
// fetching (OG-card preview, link-validity check, CV URL ingest), an
// attacker can paste `http://169.254.169.254/latest/meta-data/` or
// `http://localhost:6379` and pull cloud credentials / probe internal
// services.
//
// This validator runs on every user-link insert NOW so adding fetch-side
// preview later is automatically safe — it can't store an unsafe URL in
// the first place.
//
// Rules:
//   • Must parse as a URL.
//   • Protocol must be http: or https: (no javascript:, data:, vbscript:,
//     file:, gopher:, ftp:, blob:).
//   • Host must be a public, non-loopback hostname.
//   • Reject literal IPv4 / IPv6 addresses in the private + special-use
//     ranges (RFC 1918, RFC 6890, link-local, IPv4-mapped IPv6).
//   • Reject metadata hosts explicitly: 169.254.169.254, metadata.google.internal.

const BLOCKED_HOSTNAMES = new Set([
  "169.254.169.254",      // AWS / OpenStack metadata
  "metadata.google.internal", // GCP
  "metadata",                 // generic intranet name
  "localhost",
]);

const BLOCKED_HOST_SUFFIXES = [
  ".internal",
  ".local",
  ".localhost",
];

const BLOCKED_PROTOCOLS = new Set([
  "javascript:", "data:", "vbscript:", "file:", "gopher:",
  "ftp:", "ftps:", "blob:", "ws:", "wss:",
]);

// IPv4 private + reserved ranges (CIDR list, expanded into a regex set
// of starting octets we treat as unsafe).
function isPrivateIPv4(host) {
  // Parse octets — only treat as IPv4 if all 4 are integer octets 0–255.
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(host);
  if (!m) return false;
  const [a, b, c, d] = m.slice(1).map(Number);
  for (const n of [a, b, c, d]) {
    if (!Number.isInteger(n) || n < 0 || n > 255) return false;
  }
  if (a === 10) return true;                          // 10.0.0.0/8
  if (a === 127) return true;                         // loopback
  if (a === 0) return true;                           // 0.0.0.0/8
  if (a === 169 && b === 254) return true;            // link-local
  if (a === 172 && b >= 16 && b <= 31) return true;   // 172.16/12
  if (a === 192 && b === 168) return true;            // 192.168/16
  if (a === 100 && b >= 64 && b <= 127) return true;  // CGNAT
  if (a >= 224) return true;                          // multicast + reserved
  return false;
}

// IPv6 literal hosts must be in []-brackets per RFC 3986. Reject any
// IPv6 literal — too many footguns (::1, fe80::, mapped 4-in-6, etc).
function isIPv6Literal(host) {
  return host.startsWith("[") && host.endsWith("]");
}

export class UrlSafetyError extends Error {
  constructor(reason) {
    super(`URL rejected: ${reason}.`);
    this.reason = reason;
    this.status = 400;
  }
}

// Pure check. Returns { ok, reason }. Useful for validators that want
// a structured result.
export function checkUrlSafety(input) {
  if (typeof input !== "string" || !input.trim()) {
    return { ok: false, reason: "empty" };
  }
  let url;
  try { url = new URL(input.trim()); } catch { return { ok: false, reason: "malformed" }; }
  if (BLOCKED_PROTOCOLS.has(url.protocol)) {
    return { ok: false, reason: "blocked-protocol" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "non-http-protocol" };
  }
  const host = url.hostname.toLowerCase();
  if (!host) return { ok: false, reason: "missing-host" };
  if (BLOCKED_HOSTNAMES.has(host)) return { ok: false, reason: "blocked-hostname" };
  for (const suffix of BLOCKED_HOST_SUFFIXES) {
    if (host.endsWith(suffix)) return { ok: false, reason: "blocked-suffix" };
  }
  if (isPrivateIPv4(host)) return { ok: false, reason: "private-ipv4" };
  if (isIPv6Literal(host)) return { ok: false, reason: "ipv6-literal" };
  // Reject `user:pass@` embedded credentials.
  if (url.username || url.password) return { ok: false, reason: "embedded-credentials" };
  return { ok: true };
}

export function assertUrlSafe(input) {
  const r = checkUrlSafety(input);
  if (!r.ok) throw new UrlSafetyError(r.reason);
}
