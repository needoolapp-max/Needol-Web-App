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
const FETCH_TIMEOUT_MS = 50_000;
const AuthContext = createContext<AuthContextValue | null>(null);

class ApiError extends Error {
  constructor(message: string, public status: number) {
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
    const payload = await res.json();
    if (!res.ok) throw new ApiError(payload.error ?? "Request failed.", res.status);
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { getToken } = useClerkAuth();
  const { signOut } = useClerk();

  // Store Clerk functions in refs so useCallback deps stay stable even when
  // Clerk recreates function references on background session updates.
  const getTokenRef = useRef(getToken);
  const signOutRef = useRef(signOut);
  getTokenRef.current = getToken;
  signOutRef.current = signOut;

  // Extract stable primitives — Clerk may return a new user object reference
  // on background updates even when the actual data hasn't changed. Depending
  // on primitives instead of the object prevents false re-runs of effects and
  // callbacks.
  const clerkId = clerkUser?.id ?? null;
  const clerkName = clerkUser?.fullName ?? clerkUser?.firstName ?? "User";
  const clerkEmail = clerkUser?.primaryEmailAddress?.emailAddress ?? "";
  const clerkAvatar = clerkUser?.imageUrl ?? "";

  const [needoolUser, setNeedoolUser] = useState<User | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [backendError, setBackendError] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const retrySync = useCallback(() => setRetryCount((c) => c + 1), []);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !clerkId) {
      setNeedoolUser(null);
      setNeedsOnboarding(false);
      setBackendError(false);
      return;
    }

    setSyncing(true);
    setBackendError(false);
    getTokenRef.current()
      .then((token) => {
        if (!token) throw new Error("No session token.");
        return apiFetch("/api/auth/sync", token);
      })
      .then((data) => {
        if (data.needsOnboarding) {
          setNeedsOnboarding(true);
          setNeedoolUser(null);
        } else {
          setNeedoolUser(data.user);
          setNeedsOnboarding(false);
        }
        setBackendError(false);
      })
      .catch((err: unknown) => {
        const isTimeout = (err as Error)?.name === "AbortError";
        const isNetwork = (err as Error)?.message?.includes("Failed to fetch");
        const status = err instanceof ApiError ? err.status : 0;
        // 401/403 = backend can't verify the Clerk token (misconfigured secret key)
        // 5xx = server error — all of these should show the error screen, not onboarding
        if (isTimeout || isNetwork || status === 401 || status === 403 || status >= 500) {
          setBackendError(true);
        } else {
          setNeedsOnboarding(true);
        }
      })
      .finally(() => setSyncing(false));
  }, [isLoaded, isSignedIn, clerkId, retryCount]);

  // registerProfile only changes when the user's own name/email/avatar changes
  // (practically never mid-session). getToken is read via ref — not a dep.
  const registerProfile = useCallback(
    async (data: RegisterPayload): Promise<User> => {
      const token = await getTokenRef.current();
      if (!token) throw new Error("Not signed in.");
      const result = await apiFetch("/api/auth/register", token, {
        method: "POST",
        body: JSON.stringify({
          name: clerkName,
          email: clerkEmail,
          avatar: clerkAvatar,
          ...data,
        }),
      });
      setNeedoolUser(result.user);
      setNeedsOnboarding(false);
      return result.user as User;
    },
    [clerkName, clerkEmail, clerkAvatar],
  );

  // logout is unconditionally stable — signOut is read via ref.
  const logout = useCallback(() => {
    void signOutRef.current({ redirectUrl: "/" });
    setNeedoolUser(null);
    setNeedsOnboarding(false);
    setBackendError(false);
  }, []);

  const state: AuthState = needoolUser?.status ?? "visitor";
  const isLocked = state !== "active";
  const loading = !isLoaded || syncing;

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
    [state, needoolUser, isLocked, loading, backendError, retrySync, needsOnboarding, registerProfile, logout],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
