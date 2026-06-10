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
import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-react";
import { ApiError, apiFetch } from "@/lib/api";

export type AuthState = "visitor" | "inactive" | "active";

export type SubscriptionSummary = {
  status: "trialing" | "active" | "expired" | "cancelled" | "none";
  plan?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  trialEndAt?: string | null;
};

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  accountType: "Individual" | "Business";
  profileComplete?: boolean;
  // Phase 9 — true once the user has filled the PRD §2.3 / §2.4 demographic
  // form on /onboarding. Distinct from profileComplete which is PRD §3.1 /
  // §8.4 (bio + skills + CV — needed for job-apply eligibility).
  onboardingComplete?: boolean;
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
  subscription?: SubscriptionSummary | null;
}

interface AuthContextValue {
  state: AuthState;
  user: User | null;
  isLocked: boolean;
  loading: boolean;
  signIn: () => never;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const clerk = useClerkAuth();
  const { isLoaded: userLoaded, user: clerkUser } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const clerkRef = useRef(clerk);
  clerkRef.current = clerk;
  const getToken = useCallback(async () => {
    const c = clerkRef.current;
    if (!c.isSignedIn) return null;
    return c.getToken();
  }, []);

  const refresh = useCallback(async () => {
    if (!clerk.isLoaded || !userLoaded) return;
    if (!clerk.isSignedIn) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const result = await apiFetch<{ data: User }>("/api/auth/me", { getToken });
      setUser(result.data);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
        console.error("Failed to load /api/auth/me", error);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [clerk.isLoaded, clerk.isSignedIn, userLoaded, getToken]);

  useEffect(() => {
    void refresh();
  }, [refresh, clerkUser?.id]);

  const logout = useCallback(async () => {
    try {
      await clerk.signOut();
    } finally {
      setUser(null);
      if (typeof window !== "undefined") window.location.assign("/");
    }
  }, [clerk]);

  const signIn = useCallback(() => {
    throw new Error("Use Clerk's <SignIn /> / <SignUp /> components instead of signIn().");
  }, []);

  const state: AuthState = !user
    ? "visitor"
    : user.status === "active"
      ? "active"
      : "inactive";

  const isLocked = state !== "active";

  const contextValue = useMemo<AuthContextValue>(
    () => ({ state, user, isLocked, loading, signIn, logout, refresh, getToken }),
    [state, user, isLocked, loading, signIn, logout, refresh, getToken],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
