import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Footer } from "@/components/nav/Footer";
import { TopNav } from "@/components/nav/TopNav";
import { useAuth } from "@/context/AuthContext";
import { BadgeCheck, Gift, UserPlus } from "lucide-react";

type SignupSearch = { ref?: string };

export const Route = createFileRoute("/signup")({
  validateSearch: (search: Record<string, unknown>): SignupSearch => ({
    ref: typeof search.ref === "string" ? search.ref : "",
  }),
  head: () => ({ meta: [{ title: "Sign Up - Needool" }] }),
  component: SignupPage,
});

function SignupPage() {
  const { ref = "" } = Route.useSearch();
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    accountType: "Individual" as "Individual" | "Business",
    referralCode: ref,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signup(form);
      navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <section className="surface-elevated rounded-lg p-6">
          <div className="inline-flex rounded-md bg-primary/15 p-2 text-primary"><UserPlus className="h-5 w-5" /></div>
          <h1 className="mt-4 text-3xl font-extrabold text-foreground">Create your Needool account</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Localhost signup creates a dummy account in the backend, generates your referral code, and logs the registration in admin.
          </p>
          <div className="mt-6 grid gap-3 text-sm">
            <div className="flex gap-3 rounded-md bg-secondary p-3"><Gift className="h-4 w-4 text-accent" /> Referral codes apply a dummy 7-day active trial.</div>
            <div className="flex gap-3 rounded-md bg-secondary p-3"><BadgeCheck className="h-4 w-4 text-primary" /> Referrers get a notification and referral dashboard entry.</div>
          </div>
        </section>

        <form onSubmit={submit} className="surface-elevated rounded-lg p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold">
              Full name
              <input className="min-h-11 rounded-md border border-border bg-secondary px-3 py-2.5 font-normal outline-none focus:border-primary" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" required />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Username
              <input className="min-h-11 rounded-md border border-border bg-secondary px-3 py-2.5 font-normal outline-none focus:border-primary" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="username" required />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Email
              <input type="email" className="min-h-11 rounded-md border border-border bg-secondary px-3 py-2.5 font-normal outline-none focus:border-primary" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" required />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Password
              <input type="password" className="min-h-11 rounded-md border border-border bg-secondary px-3 py-2.5 font-normal outline-none focus:border-primary" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" required />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Account type
              <select className="min-h-11 rounded-md border border-border bg-secondary px-3 py-2.5 font-normal outline-none focus:border-primary" value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value as "Individual" | "Business" })}>
                <option>Individual</option>
                <option>Business</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Referral code
              <input className="min-h-11 rounded-md border border-border bg-secondary px-3 py-2.5 font-normal uppercase outline-none focus:border-primary" placeholder="ADA-CODES" value={form.referralCode} onChange={(e) => setForm({ ...form, referralCode: e.target.value })} />
            </label>
          </div>
          {error && <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <button disabled={loading} className="mt-6 min-h-11 w-full rounded-md bg-primary px-4 py-3 font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:bg-primary/90">
            {loading ? "Creating account..." : "Create account"}
          </button>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have a local account? <Link to="/login" className="font-bold text-primary">Log in</Link>
          </p>
        </form>
      </main>
      <Footer />
    </div>
  );
}
