import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useUser, useAuth as useClerkAuth, useClerk } from "@clerk/clerk-react";
import {
  recordDashboardApiResponse,
  recordDashboardError,
  recordDashboardEvent,
} from "@/lib/dashboard-debug";

export type AuthState = "visitor" | "inactive" | "active";

export interface User {
  id: string;
  clerkId?: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  accountType: "Individual" | "Business";
  profileComplete?: boolean;
  status: AuthState;
  referralCode: string;
  referredBy: string | null;
  referrals: Array<{
    userId: string;
    username: string;
    name: string;
    joinedAt: string;
    status: string;
  }>;
  notifications: string[];
}

export type RegisterPayload = {
  username?: string;
  accountType: "Individual" | "Business";
  referralCode?: string;
};

interface AuthContextValue {
  state: AuthState;
  user: User | null;
  isLocked: boolean;
  loading: boolean;
  backendError: boolean;
  retrySync: () => void;
  needsOnboarding: boolean;
  registerProfile: (data: RegisterPayload) => Promise<User>;
  logout: () => void;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4100";
const FETCH_TIMEOUT_MS = 25_000;
const AuthContext = createContext<AuthContextValue | null>(null);

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch(path: string, token: string, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });

    const text = await res.text();
    let payload: Record<string, unknown>;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      recordDashboardApiResponse({
        path,
        method: init?.method ?? "GET",
        status: res.status,
        ok: res.ok,
        parseError: true,
        bodyPreview: text.slice(0, 300),
      });
      throw new ApiError("Server returned an invalid response.", res.status);
    }

    recordDashboardApiResponse({
      path,
      method: init?.method ?? "GET",
      status: res.status,
      ok: res.ok,
      hasUser: Boolean(payload.user),
      needsOnboarding: payload.needsOnboarding === true,
      error: typeof payload.error === "string" ? payload.error : undefined,
    });

    if (!res.ok) {
      const message = typeof payload.error === "string" ? payload.error : "Request failed.";
      throw new ApiError(message, res.status);
    }

    return payload;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      recordDashboardApiResponse({
        path,
        method: init?.method ?? "GET",
        ok: false,
        timeoutMs: FETCH_TIMEOUT_MS,
        error: "Request timed out.",
      });
      throw new ApiError("The server took too long to respond. Please try again.", 408);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { getToken } = useClerkAuth();
  const { signOut } = useClerk();

  const getTokenRef = useRef(getToken);
  const signOutRef = useRef(signOut);
  getTokenRef.current = getToken;
  signOutRef.current = signOut;

  const clerkId = clerkUser?.id ?? null;
  const clerkName = clerkUser?.fullName ?? clerkUser?.firstName ?? "User";
  const clerkEmail = clerkUser?.primaryEmailAddress?.emailAddress ?? "";
  const clerkAvatar = clerkUser?.imageUrl ?? "";

  const [needoolUser, setNeedoolUser] = useState<User | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [backendError, setBackendError] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const retrySync = useCallback(() => {
    recordDashboardEvent("auth:retry-sync");
    setRetryCount((c) => c + 1);
  }, []);

  useEffect(() => {
    recordDashboardEvent("auth:snapshot", {
      isLoaded,
      isSignedIn,
      clerkId,
      state: needoolUser?.status ?? "visitor",
      hasNeedoolUser: Boolean(needoolUser),
      needsOnboarding,
      backendError,
      syncing,
    });
  }, [isLoaded, isSignedIn, clerkId, needoolUser, needsOnboarding, backendError, syncing]);

  useEffect(() => {
    if (!isLoaded) {
      recordDashboardEvent("auth:clerk-loading");
      return;
    }

    if (!isSignedIn || !clerkId) {
      recordDashboardEvent("auth:not-signed-in");
      setNeedoolUser(null);
      setNeedsOnboarding(false);
      setBackendError(false);
      setSyncing(false);
      return;
    }

    let cancelled = false;

    setSyncing(true);
    setBackendError(false);
    recordDashboardEvent("auth:sync-start", { clerkId, retryCount });
    getTokenRef
      .current()
      .then((token) => {
        if (!token) throw new Error("No session token.");
        return apiFetch("/api/auth/sync", token);
      })
      .then((data) => {
        if (cancelled) return;

        if (data.needsOnboarding === true) {
          recordDashboardEvent("auth:sync-needs-onboarding", { clerkId });
          setNeedsOnboarding(true);
          setNeedoolUser(null);
        } else if (data.user) {
          recordDashboardEvent("auth:sync-user", {
            clerkId,
            userStatus: (data.user as User).status,
            accountType: (data.user as User).accountType,
          });
          setNeedoolUser(data.user as User);
          setNeedsOnboarding(false);
        } else {
          throw new ApiError("Unexpected auth sync response.", 500);
        }

        setBackendError(false);
      })
      .catch((error) => {
        if (cancelled) return;
        recordDashboardError("auth:sync-error", error, {
          clerkId,
          retryCount,
          status: error instanceof ApiError ? error.status : undefined,
        });
        setNeedoolUser(null);
        setNeedsOnboarding(false);
        setBackendError(true);
      })
      .finally(() => {
        if (!cancelled) {
          recordDashboardEvent("auth:sync-finish", { clerkId, retryCount });
          setSyncing(false);
        }
      });

    return () => {
      cancelled = true;
      recordDashboardEvent("auth:sync-cancelled", { clerkId, retryCount });
    };
  }, [isLoaded, isSignedIn, clerkId, retryCount]);

  const registerProfile = useCallback(
    async (data: RegisterPayload): Promise<User> => {
      const token = await getTokenRef.current();
      if (!token) throw new Error("Not signed in.");
      recordDashboardEvent("auth:register-start", {
        clerkId,
        accountType: data.accountType,
        hasUsername: Boolean(data.username),
        hasReferralCode: Boolean(data.referralCode),
      });
      const result = await apiFetch("/api/auth/register", token, {
        method: "POST",
        body: JSON.stringify({
          name: clerkName,
          email: clerkEmail,
          avatar: clerkAvatar,
          ...data,
        }),
      });
      recordDashboardEvent("auth:register-success", {
        clerkId,
        userStatus: (result.user as User | undefined)?.status,
      });
      setNeedoolUser(result.user as User);
      setNeedsOnboarding(false);
      return result.user as User;
    },
    [clerkId, clerkName, clerkEmail, clerkAvatar],
  );

  const logout = useCallback(() => {
    recordDashboardEvent("auth:logout");
    void signOutRef.current({ redirectUrl: "/" });
    setNeedoolUser(null);
    setNeedsOnboarding(false);
    setBackendError(false);
  }, []);

  const state: AuthState = needoolUser?.status ?? "visitor";
  const isLocked = state !== "active";
  const loading = !isLoaded || (syncing && !needoolUser && !needsOnboarding && !backendError);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      state,
      user: needoolUser,
      isLocked,
      loading,
      backendError,
      retrySync,
      needsOnboarding,
      registerProfile,
      logout,
    }),
    [
      state,
      needoolUser,
      isLocked,
      loading,
      backendError,
      retrySync,
      needsOnboarding,
      registerProfile,
      logout,
    ],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
