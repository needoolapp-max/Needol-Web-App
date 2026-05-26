import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  useUser,
  useAuth as useClerkAuth,
  useClerk,
} from "@clerk/clerk-react";

export type AuthState = "visitor" | "inactive" | "active";

export interface User {
  id: string;
  clerkId?: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  accountType: "Individual" | "Business";
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
  username: string;
  accountType: "Individual" | "Business";
  referralCode?: string;
};

interface AuthContextValue {
  state: AuthState;
  user: User | null;
  isLocked: boolean;
  loading: boolean;
  needsOnboarding: boolean;
  registerProfile: (data: RegisterPayload) => Promise<User>;
  logout: () => void;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4100";
const AuthContext = createContext<AuthContextValue | null>(null);

async function apiFetch(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  const payload = await res.json();
  if (!res.ok) throw new Error(payload.error ?? "Request failed.");
  return payload;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { getToken } = useClerkAuth();
  const { signOut } = useClerk();

  const [needoolUser, setNeedoolUser] = useState<User | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !clerkUser) {
      setNeedoolUser(null);
      setNeedsOnboarding(false);
      return;
    }

    setSyncing(true);
    getToken()
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
      })
      .catch(() => {
        setNeedsOnboarding(true);
      })
      .finally(() => setSyncing(false));
  }, [isLoaded, isSignedIn, clerkUser?.id]);

  const registerProfile = async (data: RegisterPayload): Promise<User> => {
    const token = await getToken();
    if (!token) throw new Error("Not signed in.");
    const result = await apiFetch("/api/auth/register", token, {
      method: "POST",
      body: JSON.stringify({
        name: clerkUser?.fullName ?? clerkUser?.firstName ?? "User",
        email: clerkUser?.primaryEmailAddress?.emailAddress ?? "",
        avatar: clerkUser?.imageUrl ?? "",
        ...data,
      }),
    });
    setNeedoolUser(result.user);
    setNeedsOnboarding(false);
    return result.user as User;
  };

  const logout = () => {
    void signOut({ redirectUrl: "/" });
    setNeedoolUser(null);
    setNeedsOnboarding(false);
  };

  const state: AuthState = needoolUser?.status ?? "visitor";
  const isLocked = state !== "active";
  const loading = !isLoaded || syncing;

  return (
    <AuthContext.Provider
      value={{ state, user: needoolUser, isLocked, loading, needsOnboarding, registerProfile, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
