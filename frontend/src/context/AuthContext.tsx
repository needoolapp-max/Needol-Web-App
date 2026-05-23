import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type AuthState = "visitor" | "inactive" | "active";

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  accountType: "Individual" | "Business";
  status: AuthState;
  referralCode: string;
  referredBy: string | null;
  referrals: Array<{ userId: string; username: string; name: string; joinedAt: string; status: string }>;
  notifications: string[];
}

interface AuthContextValue {
  state: AuthState;
  setState: (s: AuthState) => void;
  user: User | null;
  isLocked: boolean;
  loading: boolean;
  login: (identity: string, password: string) => Promise<User>;
  signup: (payload: SignupPayload) => Promise<User>;
  logout: () => void;
}

type SignupPayload = {
  name: string;
  username: string;
  email: string;
  password: string;
  accountType: "Individual" | "Business";
  referralCode?: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4100";
const AuthContext = createContext<AuthContextValue | null>(null);

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Local auth request failed.");
  return payload;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setStateRaw] = useState<AuthState>("visitor");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("needool-token");
    const savedState = localStorage.getItem("needool-auth");
    if (savedState === "visitor" || savedState === "inactive" || savedState === "active") {
      setStateRaw(savedState);
    }
    if (!token) {
      setLoading(false);
      return;
    }
    request(`/api/auth/session?token=${encodeURIComponent(token)}`)
      .then(({ user: nextUser }) => {
        setUser(nextUser);
        setStateRaw(nextUser.status);
        localStorage.setItem("needool-auth", nextUser.status);
      })
      .catch(() => {
        localStorage.removeItem("needool-token");
        localStorage.setItem("needool-auth", "visitor");
        setStateRaw("visitor");
      })
      .finally(() => setLoading(false));
  }, []);

  const setState = (s: AuthState) => {
    setStateRaw(s);
    localStorage.setItem("needool-auth", s);
  };

  const login = async (identity: string, password: string) => {
    const payload = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ identity, password }),
    });
    localStorage.setItem("needool-token", payload.token);
    localStorage.setItem("needool-auth", payload.user.status);
    setUser(payload.user);
    setStateRaw(payload.user.status);
    return payload.user as User;
  };

  const signup = async (form: SignupPayload) => {
    const payload = await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(form),
    });
    localStorage.setItem("needool-token", payload.token);
    localStorage.setItem("needool-auth", payload.user.status);
    setUser(payload.user);
    setStateRaw(payload.user.status);
    return payload.user as User;
  };

  const logout = () => {
    localStorage.removeItem("needool-token");
    localStorage.setItem("needool-auth", "visitor");
    setUser(null);
    setStateRaw("visitor");
  };

  const isLocked = state !== "active";

  return (
    <AuthContext.Provider value={{ state, setState, user, isLocked, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
