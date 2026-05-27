import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSignIn, useUser } from "@clerk/clerk-react";
import { useState, useEffect, type FormEvent } from "react";
import { Footer } from "@/components/nav/Footer";
import { TopNav } from "@/components/nav/TopNav";
import { LogIn, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login - Needool" }] }),
  component: LoginPage,
});

function clerkMessage(err: unknown): string {
  if (err && typeof err === "object" && "errors" in err) {
    const e = (err as { errors: Array<{ longMessage?: string; message: string }> }).errors;
    return e[0]?.longMessage ?? e[0]?.message ?? "Could not sign in.";
  }
  return err instanceof Error ? err.message : "Could not sign in.";
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2a10.34 10.34 0 0 0-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.34A9 9 0 0 0 9 18Z" fill="#34A853" />
      <path d="M3.97 10.71A5.41 5.41 0 0 1 3.69 9c0-.6.1-1.17.28-1.71V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.34Z" fill="#FBBC05" />
      <path d="M9 3.58c1.32 0 2.51.45 3.44 1.34l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95L3.97 7.3C4.68 5.16 6.66 3.58 9 3.58Z" fill="#EA4335" />
    </svg>
  );
}

function LoginPage() {
  const { isLoaded: userLoaded, isSignedIn } = useUser();
  const { signIn, setActive, isLoaded } = useSignIn();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (userLoaded && isSignedIn) navigate({ to: "/dashboard" });
  }, [userLoaded, isSignedIn, navigate]);

  if (!userLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!signIn || !isLoaded) return;
    setError("");
    setLoading(true);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate({ to: "/dashboard" });
      } else {
        setError("Sign-in requires an additional step. Please check your email.");
      }
    } catch (err) {
      setError(clerkMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    if (!signIn || !isLoaded) return;
    setGoogleLoading(true);
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectUrlComplete: "/dashboard",
      });
    } catch (err) {
      setError(clerkMessage(err));
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto grid max-w-5xl gap-8 px-4 py-12 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="surface-elevated rounded-2xl p-6">
          <div className="inline-flex rounded-xl bg-primary/15 p-2 text-primary">
            <LogIn className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold text-foreground">
            Welcome back to Needool
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Log in to access your dashboard, manage your profile, and connect
            with providers worldwide.
          </p>
          <div className="mt-6 grid gap-3 text-sm">
            <div className="flex gap-3 rounded-xl bg-secondary p-3 text-muted-foreground">
              <LogIn className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              Access your referral dashboard, needs, and saved providers.
            </div>
          </div>
        </section>

        <div className="surface-elevated rounded-2xl p-6">
          {/* Google sign-in */}
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={googleLoading || !isLoaded}
            className="mb-5 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-secondary/60 px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
          >
            <GoogleIcon />
            {googleLoading ? "Redirecting…" : "Continue with Google"}
          </button>

          <div className="relative mb-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground">or sign in with email</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit}>
            <label className="grid gap-2 text-sm font-semibold">
              Email
              <input
                type="email"
                className="min-h-11 rounded-xl border border-border bg-secondary px-3 py-2.5 font-normal outline-none focus:border-primary"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className="mt-4 grid gap-2 text-sm font-semibold">
              Password
              <input
                type="password"
                className="min-h-11 rounded-xl border border-border bg-secondary px-3 py-2.5 font-normal outline-none focus:border-primary"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {error && (
              <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || !isLoaded}
              className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary/90 disabled:opacity-60 disabled:translate-y-0"
            >
              <ShieldCheck className="h-4 w-4" />
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="font-bold text-primary">
              Create one free
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
