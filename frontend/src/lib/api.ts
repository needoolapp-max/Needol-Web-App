export const API_BASE_URL = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || "http://localhost:4100"
).replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type GetTokenFn = () => Promise<string | null>;

async function jsonOrThrow(response: Response) {
  const text = await response.text();
  const body = text ? safeParse(text) : null;
  if (!response.ok) {
    const message =
      (body && typeof body === "object" && "error" in body && (body as { error?: string }).error) ||
      `Request failed with ${response.status}`;
    const code =
      body && typeof body === "object" && "code" in body
        ? ((body as { code?: string }).code ?? undefined)
        : undefined;
    throw new ApiError(response.status, String(message), code);
  }
  return body;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// Phase 8-5 — Read the ndl_csrf cookie value (set by the backend on every
// safe-method response) and mirror it into the x-csrf-token header on
// state-changing requests. This is the double-submit half of the OWASP
// CSRF defense.
function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie || "";
  for (const part of raw.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    if (k === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit & { getToken?: GetTokenFn } = {},
): Promise<T> {
  const { getToken, headers, method, ...rest } = init;
  const authHeaders: Record<string, string> = {};
  if (getToken) {
    const token = await getToken();
    if (token) authHeaders.Authorization = `Bearer ${token}`;
  }
  const csrfHeaders: Record<string, string> = {};
  const isMutation =
    method && ["POST", "PATCH", "DELETE", "PUT"].includes(method.toUpperCase());
  if (isMutation) {
    const csrf = readCookie("ndl_csrf");
    if (csrf) csrfHeaders["x-csrf-token"] = csrf;
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    method,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...authHeaders,
      ...csrfHeaders,
      ...(headers as Record<string, string>),
    },
  });
  return (await jsonOrThrow(response)) as T;
}
