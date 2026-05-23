import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Footer } from "@/components/nav/Footer";
import { TopNav } from "@/components/nav/TopNav";
import { useAuth } from "@/context/AuthContext";
import { LogIn, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login - Needool" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identity, setIdentity] = useState("ada@needool.local");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(identity, password);
      navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto grid max-w-5xl gap-8 px-4 py-12 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="surface-elevated rounded-lg p-6">
          <div className="inline-flex rounded-md bg-primary/15 p-2 text-primary"><LogIn className="h-5 w-5" /></div>
          <h1 className="mt-4 text-3xl font-extrabold text-foreground">Log in to Needool</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            This is local-only login. Use a seeded account or one you created on localhost.
          </p>
          <div className="mt-5 rounded-md bg-secondary p-3 text-sm text-muted-foreground">
            Demo account: <strong className="text-foreground">ada@needool.local</strong> / <strong className="text-foreground">password</strong>
          </div>
        </section>

        <form onSubmit={submit} className="surface-elevated rounded-lg p-6">
          <label className="grid gap-2 text-sm font-semibold">
            Email or username
            <input className="min-h-11 rounded-md border border-border bg-secondary px-3 py-2.5 font-normal outline-none focus:border-primary" value={identity} onChange={(e) => setIdentity(e.target.value)} autoComplete="username" required />
          </label>
          <label className="mt-4 grid gap-2 text-sm font-semibold">
            Password
            <input type="password" className="min-h-11 rounded-md border border-border bg-secondary px-3 py-2.5 font-normal outline-none focus:border-primary" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </label>
          {error && <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <button disabled={loading} className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:bg-primary/90">
            <ShieldCheck className="h-4 w-4" /> {loading ? "Logging in..." : "Log in"}
          </button>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Need an account? <Link to="/signup" className="font-bold text-primary">Sign up</Link>
          </p>
        </form>
      </main>
      <Footer />
    </div>
  );
}
