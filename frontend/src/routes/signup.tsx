import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSignUp, useUser } from "@clerk/clerk-react";
import { useState, useEffect, type FormEvent } from "react";
import { BadgeCheck, Gift, Globe, KeyRound, ShieldCheck, Zap } from "lucide-react";

type SignupSearch = { ref?: string };

export const Route = createFileRoute("/signup")({
  validateSearch: (search: Record<string, unknown>): SignupSearch => ({
    ref: typeof search.ref === "string" ? search.ref : "",
  }),
  head: () => ({ meta: [{ title: "Create Account - Needool" }] }),
  component: SignupPage,
});

function clerkMessage(err: unknown): string {
  if (err && typeof err === "object" && "errors" in err) {
    const e = (err as { errors: Array<{ longMessage?: string; message: string }> }).errors;
    return e[0]?.longMessage ?? e[0]?.message ?? "Could not create account.";
  }
  return err instanceof Error ? err.message : "Could not create account.";
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0">
      <path d="M17.64 9.2a10.34 10.34 0 0 0-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.34A9 9 0 0 0 9 18Z" fill="#34A853" />
      <path d="M3.97 10.71A5.41 5.41 0 0 1 3.69 9c0-.6.1-1.17.28-1.71V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.34Z" fill="#FBBC05" />
      <path d="M9 3.58c1.32 0 2.51.45 3.44 1.34l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95L3.97 7.3C4.68 5.16 6.66 3.58 9 3.58Z" fill="#EA4335" />
    </svg>
  );
}

function BrandPanel({ headline }: { headline: string }) {
  return (
    <div
      className="hidden lg:flex lg:w-[45%] xl:w-[42%] shrink-0 flex-col justify-between p-10 relative overflow-hidden"
      style={{
        background: "linear-gradient(145deg, #0277b4 0%, #01587f 50%, #0d1b2a 100%)",
      }}
    >
      {/* Grid overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,rgba(255,255,255,0.04) 0px,rgba(255,255,255,0.04) 1px,transparent 1px,transparent 48px)," +
            "repeating-linear-gradient(90deg,rgba(255,255,255,0.04) 0px,rgba(255,255,255,0.04) 1px,transparent 1px,transparent 48px)",
        }}
      />
      {/* Orbs */}
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
          <img src="/brand-logo.webp" alt="Needool" width="149" height="120" className="h-12 w-auto brightness-0 invert" />
        </Link>
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-center py-12">
        <h1 className="text-4xl font-extrabold text-white leading-tight tracking-tight">
          {headline}
        </h1>
        <p className="mt-3 text-lg text-white/70 max-w-xs leading-relaxed">
          Connect with skilled providers and clients across the globe.
        </p>

        <ul className="mt-10 grid gap-4">
          {[
            { icon: Gift, text: "Referral rewards from day one" },
            { icon: BadgeCheck, text: "Verified providers you can trust" },
            { icon: ShieldCheck, text: "Secure, privacy-first accounts" },
            { icon: Globe, text: "100+ countries and growing" },
            { icon: Zap, text: "Go live in under 2 minutes" },
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
  );
}

function SignupPage() {
  const { ref = "" } = Route.useSearch();
  const { isLoaded: userLoaded, isSignedIn } = useUser();
  const { signUp, setActive, isLoaded } = useSignUp();
  const navigate = useNavigate();

  const [step, setStep] = useState<"form" | "verify">("form");
  const [showReferral, setShowReferral] = useState(Boolean(ref));
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    referralCode: ref,
  });
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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

  async function submitForm(e: FormEvent) {
    e.preventDefault();
    if (!signUp || !isLoaded) return;
    setError("");
    setLoading(true);
    try {
      await signUp.create({
        emailAddress: form.email,
        password: form.password,
        firstName: form.name.trim().split(" ")[0],
        lastName: form.name.trim().split(" ").slice(1).join(" ") || undefined,
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
    } catch (err) {
      setError(clerkMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    if (!signUp || !isLoaded) return;
    setError("");
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        // Profile registration (username + referral) happens in DashboardLayout onboarding
        // Pass referral code via backend sync if provided; store in sessionStorage for pickup
        const cleanReferral = form.referralCode.trim().toUpperCase();
        if (cleanReferral) sessionStorage.setItem("ndl_ref", cleanReferral);
        navigate({ to: "/dashboard" });
      } else {
        setError("Verification incomplete. Please try again.");
      }
    } catch (err) {
      setError(clerkMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function signUpWithGoogle() {
    if (!signUp || !isLoaded) return;
    setGoogleLoading(true);
    try {
      await signUp.authenticateWithRedirect({
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
    <div className="flex min-h-screen">
      <BrandPanel headline={step === "verify" ? "Almost there!" : "Join Needool today"} />

      {/* ── Right form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12">
        {/* Mobile logo */}
        <div className="mb-8 lg:hidden">
          <Link to="/">
            <img src="/brand-logo.webp" alt="Needool" width="149" height="120" className="h-10 w-auto" />
          </Link>
        </div>

        <div className="w-full max-w-sm">
          {step === "form" ? (
            <>
              <h2 className="text-2xl font-extrabold text-foreground">Create your account</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Already have one?{" "}
                <Link to="/login" className="font-semibold text-primary hover:underline">
                  Sign in
                </Link>
              </p>

              {/* Google */}
              <button
                type="button"
                onClick={signUpWithGoogle}
                disabled={googleLoading || !isLoaded}
                className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl border-2 border-border bg-background px-4 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-secondary disabled:opacity-60"
              >
                <GoogleIcon />
                {googleLoading ? "Redirecting…" : "Sign up with Google"}
              </button>

              <div className="relative my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground">or sign up with email</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={submitForm} className="grid gap-4">
                <label className="grid gap-2 text-sm font-semibold">
                  Full name
                  <input
                    className="min-h-11 rounded-xl border border-border bg-secondary px-3 py-2.5 font-normal outline-none focus:border-primary"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    autoComplete="name"
                    placeholder="Jane Smith"
                    required
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold">
                  Email address
                  <input
                    type="email"
                    className="min-h-11 rounded-xl border border-border bg-secondary px-3 py-2.5 font-normal outline-none focus:border-primary"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    autoComplete="email"
                    placeholder="jane@example.com"
                    required
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold">
                  Password
                  <input
                    type="password"
                    className="min-h-11 rounded-xl border border-border bg-secondary px-3 py-2.5 font-normal outline-none focus:border-primary"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
                    required
                  />
                </label>

                {/* Collapsible referral code */}
                {!showReferral ? (
                  <button
                    type="button"
                    onClick={() => setShowReferral(true)}
                    className="text-left text-xs font-medium text-primary hover:underline"
                  >
                    Have a referral code?
                  </button>
                ) : (
                  <label className="grid gap-2 text-sm font-semibold">
                    Referral code
                    <input
                      className="min-h-11 rounded-xl border border-border bg-secondary px-3 py-2.5 font-normal uppercase tracking-wider outline-none focus:border-primary"
                      placeholder="e.g. JANE2024"
                      value={form.referralCode}
                      onChange={(e) => setForm({ ...form, referralCode: e.target.value })}
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      inputMode="text"
                    />
                  </label>
                )}

                {error && (
                  <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <div id="clerk-captcha" />

                <button
                  type="submit"
                  disabled={loading || !isLoaded}
                  className="mt-2 min-h-11 w-full rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:-translate-y-0.5 hover:bg-primary/90 disabled:translate-y-0 disabled:opacity-60"
                >
                  {loading ? "Creating account…" : "Create account"}
                </button>
              </form>

              <p className="mt-8 text-center text-xs text-muted-foreground">
                By creating an account you agree to our{" "}
                <Link to="/" className="underline hover:text-foreground">Terms</Link>
                {" "}and{" "}
                <Link to="/" className="underline hover:text-foreground">Privacy Policy</Link>.
              </p>
            </>
          ) : (
            <form onSubmit={submitCode}>
              <div className="mb-5 inline-flex rounded-2xl bg-primary/10 p-4 text-primary">
                <KeyRound className="h-6 w-6" />
              </div>

              <h2 className="text-2xl font-extrabold text-foreground">Check your email</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                We sent a 6-digit code to{" "}
                <strong className="text-foreground">{form.email}</strong>.
                Enter it below to verify your account.
              </p>

              <label className="mt-8 grid gap-3 text-sm font-semibold">
                Verification code
                <input
                  className="min-h-14 rounded-xl border-2 border-border bg-secondary px-4 py-3 text-center text-3xl font-mono tracking-[0.5em] outline-none focus:border-primary"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  maxLength={6}
                  required
                  autoFocus
                />
              </label>

              {error && (
                <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || code.length < 6}
                className="mt-6 min-h-11 w-full rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:-translate-y-0.5 hover:bg-primary/90 disabled:translate-y-0 disabled:opacity-60"
              >
                {loading ? "Verifying…" : "Verify & finish"}
              </button>

              <button
                type="button"
                onClick={() => { setStep("form"); setError(""); setCode(""); }}
                className="mt-3 w-full rounded-xl px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back to account details
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
