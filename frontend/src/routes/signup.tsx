import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSignUp } from "@clerk/clerk-react";
import { useState, type FormEvent } from "react";
import { Footer } from "@/components/nav/Footer";
import { TopNav } from "@/components/nav/TopNav";
import { useAuth } from "@/context/AuthContext";
import { BadgeCheck, Gift, KeyRound, UserPlus } from "lucide-react";

type SignupSearch = { ref?: string };

export const Route = createFileRoute("/signup")({
  validateSearch: (search: Record<string, unknown>): SignupSearch => ({
    ref: typeof search.ref === "string" ? search.ref : "",
  }),
  head: () => ({ meta: [{ title: "Sign Up - Needool" }] }),
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
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2a10.34 10.34 0 0 0-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.34A9 9 0 0 0 9 18Z" fill="#34A853" />
      <path d="M3.97 10.71A5.41 5.41 0 0 1 3.69 9c0-.6.1-1.17.28-1.71V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.34Z" fill="#FBBC05" />
      <path d="M9 3.58c1.32 0 2.51.45 3.44 1.34l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95L3.97 7.3C4.68 5.16 6.66 3.58 9 3.58Z" fill="#EA4335" />
    </svg>
  );
}

function SignupPage() {
  const { ref = "" } = Route.useSearch();
  const { signUp, setActive, isLoaded } = useSignUp();
  const { registerProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<"form" | "verify">("form");
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    accountType: "Individual" as "Individual" | "Business",
    referralCode: ref,
  });
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function submitForm(e: FormEvent) {
    e.preventDefault();
    if (!signUp || !isLoaded) return;
    setError("");
    setLoading(true);
    try {
      await signUp.create({
        emailAddress: form.email,
        password: form.password,
        firstName: form.name.split(" ")[0],
        lastName: form.name.split(" ").slice(1).join(" ") || undefined,
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
        await registerProfile({
          username: form.username,
          accountType: form.accountType,
          referralCode: form.referralCode || undefined,
        });
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
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <section className="surface-elevated rounded-2xl p-6">
          <div className="inline-flex rounded-xl bg-primary/15 p-2 text-primary">
            <UserPlus className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold text-foreground">
            Create your Needool account
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Join thousands of providers and clients on Needool — the global
            skills and services marketplace.
          </p>
          <div className="mt-6 grid gap-3 text-sm">
            <div className="flex gap-3 rounded-xl bg-secondary p-3">
              <Gift className="h-4 w-4 shrink-0 text-accent mt-0.5" />
              Have a referral code? Enter it below to unlock your active account
              immediately.
            </div>
            <div className="flex gap-3 rounded-xl bg-secondary p-3">
              <BadgeCheck className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              Referrers earn rewards every time someone joins with their code.
            </div>
          </div>
        </section>

        <div className="surface-elevated rounded-2xl p-6">
          {step === "form" ? (
            <>
              <button
                type="button"
                onClick={signUpWithGoogle}
                disabled={googleLoading || !isLoaded}
                className="mb-5 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-secondary/60 px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
              >
                <GoogleIcon />
                {googleLoading ? "Redirecting…" : "Sign up with Google"}
              </button>

              <div className="relative mb-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground">
                  or sign up with email
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={submitForm}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-semibold">
                    Full name
                    <input
                      className="min-h-11 rounded-xl border border-border bg-secondary px-3 py-2.5 font-normal outline-none focus:border-primary"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      autoComplete="name"
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold">
                    Username
                    <input
                      className="min-h-11 rounded-xl border border-border bg-secondary px-3 py-2.5 font-normal outline-none focus:border-primary"
                      value={form.username}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          username: e.target.value.toLowerCase().replace(/\s/g, ""),
                        })
                      }
                      autoComplete="username"
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold">
                    Email
                    <input
                      type="email"
                      className="min-h-11 rounded-xl border border-border bg-secondary px-3 py-2.5 font-normal outline-none focus:border-primary"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      autoComplete="email"
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold">
                    Password
                    <input
                      type="password"
                      className="min-h-11 rounded-xl border border-border bg-secondary px-3 py-2.5 font-normal outline-none focus:border-primary"
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      autoComplete="new-password"
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold">
                    Account type
                    <select
                      className="min-h-11 rounded-xl border border-border bg-secondary px-3 py-2.5 font-normal outline-none focus:border-primary"
                      value={form.accountType}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          accountType: e.target.value as "Individual" | "Business",
                        })
                      }
                    >
                      <option>Individual</option>
                      <option>Business</option>
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-semibold">
                    Referral code
                    <input
                      className="min-h-11 rounded-xl border border-border bg-secondary px-3 py-2.5 font-normal uppercase outline-none focus:border-primary"
                      placeholder="Optional"
                      value={form.referralCode}
                      onChange={(e) =>
                        setForm({ ...form, referralCode: e.target.value })
                      }
                    />
                  </label>
                </div>
                {error && (
                  <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading || !isLoaded}
                  className="mt-6 min-h-11 w-full rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary/90 disabled:opacity-60 disabled:translate-y-0"
                >
                  {loading ? "Creating account…" : "Create account"}
                </button>
              </form>
            </>
          ) : (
            <form onSubmit={submitCode}>
              <div className="mb-6 inline-flex rounded-xl bg-primary/15 p-3 text-primary">
                <KeyRound className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                Verify your email
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a 6-digit code to{" "}
                <strong className="text-foreground">{form.email}</strong>. Enter
                it below to confirm your account.
              </p>
              <label className="mt-6 grid gap-2 text-sm font-semibold">
                Verification code
                <input
                  className="min-h-11 rounded-xl border border-border bg-secondary px-3 py-2.5 text-center text-xl font-mono tracking-widest outline-none focus:border-primary"
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
                className="mt-6 min-h-11 w-full rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary/90 disabled:opacity-60 disabled:translate-y-0"
              >
                {loading ? "Verifying…" : "Verify & finish"}
              </button>
              <button
                type="button"
                onClick={() => { setStep("form"); setError(""); setCode(""); }}
                className="mt-3 w-full rounded-xl px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back
              </button>
            </form>
          )}

          {step === "form" && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-bold text-primary">
                Log in
              </Link>
            </p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
