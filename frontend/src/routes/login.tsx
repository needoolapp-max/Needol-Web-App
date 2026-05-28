import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSignIn, useUser } from "@clerk/clerk-react";
import { useState, useEffect, useRef, type FormEvent } from "react";
import { Globe, ShieldCheck, Zap } from "lucide-react";
import { toast } from "sonner";
import { clerkMessage, withTimeout, NO_AUTOFILL_PROPS } from "@/lib/auth-helpers";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign In - Needool" }] }),
  component: LoginPage,
});

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0">
      <path
        d="M17.64 9.2a10.34 10.34 0 0 0-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.34A9 9 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.97 10.71A5.41 5.41 0 0 1 3.69 9c0-.6.1-1.17.28-1.71V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.34Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.32 0 2.51.45 3.44 1.34l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95L3.97 7.3C4.68 5.16 6.66 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function LoginPage() {
  const { isLoaded: userLoaded, isSignedIn } = useUser();
  const { signIn, setActive, isLoaded } = useSignIn();
  const navigate = useNavigate();

  // Refs so Clerk objects don't sit in useEffect dependency arrays
  const signInRef = useRef(signIn);
  signInRef.current = signIn;
  const setActiveRef = useRef(setActive);
  setActiveRef.current = setActive;

  // Ref to read the email input value when switching to forgot-password mode
  const emailInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState<"idle" | "entry" | "sent">("idle");
  // Stores the email address that was submitted to show in the "sent" confirmation
  const [forgotEmailSent, setForgotEmailSent] = useState("");
  // Default value for the forgot-password email input (pre-filled from sign-in email field)
  const [forgotEmailDefault, setForgotEmailDefault] = useState("");

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

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const signInClient = signInRef.current;
    const activate = setActiveRef.current;
    if (!signInClient || !activate || !isLoaded) return;
    setError("");
    setLoading(true);
    const data = new FormData(e.currentTarget);
    const email = (data.get("email") as string).trim();
    const password = data.get("password") as string;
    try {
      const result = await withTimeout(signInClient.create({ identifier: email, password }));
      if (result.status === "complete") {
        await activate({ session: result.createdSessionId });
        navigate({ to: "/dashboard" });
      } else {
        const msg = "Sign-in requires an additional step. Please check your email.";
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = clerkMessage(err, "Could not sign in.");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function sendReset(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!signInRef.current || !isLoaded) return;
    setError("");
    setLoading(true);
    const data = new FormData(e.currentTarget);
    const forgotEmail = (data.get("email") as string).trim();
    try {
      await withTimeout(
        signInRef.current.create({
          strategy: "reset_password_email_code",
          identifier: forgotEmail,
        }),
      );
      setForgotEmailSent(forgotEmail);
      setForgotMode("sent");
    } catch (err) {
      const msg = clerkMessage(err, "Could not send the reset email.");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    if (!signInRef.current || !isLoaded) return;
    setGoogleLoading(true);
    try {
      await signInRef.current.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectUrlComplete: "/dashboard",
      });
    } catch (err) {
      const msg = clerkMessage(err, "Could not connect to Google.");
      setError(msg);
      toast.error(msg);
      setGoogleLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Left brand panel ── */}
      <div
        className="hidden lg:flex lg:w-[45%] xl:w-[42%] shrink-0 flex-col justify-between p-10 relative overflow-hidden"
        style={{
          background: "linear-gradient(145deg, #0277b4 0%, #01587f 50%, #0d1b2a 100%)",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg,rgba(255,255,255,0.04) 0px,rgba(255,255,255,0.04) 1px,transparent 1px,transparent 48px)," +
              "repeating-linear-gradient(90deg,rgba(255,255,255,0.04) 0px,rgba(255,255,255,0.04) 1px,transparent 1px,transparent 48px)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #00c8d4, transparent 70%)" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -left-16 h-64 w-64 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #ffffff, transparent 70%)" }}
        />

        <div className="relative z-10">
          <Link to="/">
            <img
              src="/brand-logo.webp"
              alt="Needool"
              width="149"
              height="120"
              className="h-12 w-auto brightness-0 invert"
            />
          </Link>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center py-12">
          <h1 className="text-4xl font-extrabold text-white leading-tight tracking-tight">
            Welcome back
          </h1>
          <p className="mt-3 text-lg text-white/70 max-w-xs leading-relaxed">
            Sign in to your Needool account and pick up right where you left off.
          </p>

          <ul className="mt-10 grid gap-4">
            {[
              { icon: ShieldCheck, text: "Secure authentication via Clerk" },
              { icon: Globe, text: "Access providers across 100+ countries" },
              { icon: Zap, text: "Instant dashboard — zero loading delays" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <Icon className="h-4 w-4 text-white" />
                </span>
                <span className="text-sm text-white/80">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 text-xs text-white/40">
          © {new Date().getFullYear()} Needool. All rights reserved.
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12">
        {/* Mobile logo */}
        <div className="mb-8 lg:hidden">
          <Link to="/">
            <img
              src="/brand-logo.webp"
              alt="Needool"
              width="149"
              height="120"
              className="h-10 w-auto"
            />
          </Link>
        </div>

        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-extrabold text-foreground">Sign in to your account</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            New here?{" "}
            <Link to="/signup" className="font-semibold text-primary hover:underline">
              Create a free account
            </Link>
          </p>

          {error && forgotMode === "idle" && (
            <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}

          {/* Google */}
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={googleLoading || !isLoaded}
            className="mt-4 flex w-full items-center justify-center gap-3 rounded-xl border-2 border-border bg-background px-4 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-secondary disabled:opacity-60"
          >
            <GoogleIcon />
            {googleLoading ? "Redirecting…" : "Continue with Google"}
          </button>

          <div className="relative my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground">or sign in with email</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          {forgotMode === "sent" ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center">
              <p className="text-sm font-semibold text-foreground">Check your inbox</p>
              <p className="mt-1 text-sm text-muted-foreground">
                We sent a password reset link to{" "}
                <strong className="text-foreground">{forgotEmailSent}</strong>.
              </p>
              <button
                type="button"
                onClick={() => {
                  setForgotMode("idle");
                  setError("");
                }}
                className="mt-4 text-xs font-medium text-primary hover:underline"
              >
                ← Back to sign in
              </button>
            </div>
          ) : forgotMode === "entry" ? (
            <form onSubmit={sendReset} className="grid gap-4">
              <p className="text-sm text-muted-foreground">
                Enter the email address on your account and we'll send a reset link.
              </p>
              <label className="grid gap-2 text-sm font-semibold">
                Email address
                <input
                  key={forgotEmailDefault}
                  name="email"
                  type="email"
                  className="min-h-11 rounded-xl border border-border bg-secondary px-3 py-2.5 text-base font-normal outline-none focus:border-primary"
                  defaultValue={forgotEmailDefault}
                  autoComplete="email"
                  autoFocus
                  required
                  {...NO_AUTOFILL_PROPS}
                />
              </label>
              {error && (
                <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading || !isLoaded}
                className="min-h-11 w-full rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:-translate-y-0.5 hover:bg-primary/90 disabled:translate-y-0 disabled:opacity-60"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForgotMode("idle");
                  setError("");
                }}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back to sign in
              </button>
            </form>
          ) : (
            <form onSubmit={submit} className="grid gap-4">
              <label className="grid gap-2 text-sm font-semibold">
                Email address
                <input
                  ref={emailInputRef}
                  name="email"
                  type="email"
                  className="min-h-11 rounded-xl border border-border bg-secondary px-3 py-2.5 text-base font-normal outline-none focus:border-primary"
                  autoComplete="email"
                  required
                  {...NO_AUTOFILL_PROPS}
                />
              </label>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Password</span>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmailDefault(emailInputRef.current?.value ?? "");
                      setForgotMode("entry");
                      setError("");
                    }}
                    className="text-xs text-muted-foreground hover:text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  name="password"
                  type="password"
                  className="min-h-11 rounded-xl border border-border bg-secondary px-3 py-2.5 text-base font-normal outline-none focus:border-primary"
                  autoComplete="current-password"
                  required
                  {...NO_AUTOFILL_PROPS}
                />
              </div>

              {error && (
                <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !isLoaded}
                className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:-translate-y-0.5 hover:bg-primary/90 disabled:translate-y-0 disabled:opacity-60"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          )}

          {forgotMode === "idle" && (
            <p className="mt-8 text-center text-xs text-muted-foreground">
              By signing in you agree to our{" "}
              <Link to="/" className="underline hover:text-foreground">
                Terms
              </Link>{" "}
              and{" "}
              <Link to="/" className="underline hover:text-foreground">
                Privacy Policy
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
