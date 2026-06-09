import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { TopNav } from "@/components/nav/TopNav";
import { Footer } from "@/components/nav/Footer";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, ApiError } from "@/lib/api";

type Kind = "need" | "opportunity";

type Props = {
  kind: Kind;
  title: string;
  subtitle: string;
};

const COUNTRIES = ["Worldwide", "Nigeria", "Ghana", "Kenya", "South Africa", "United States", "United Kingdom", "India"];

export function CreatePostForm({ kind, title, subtitle }: Props) {
  const { user, state, getToken, refresh } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state !== "active") {
      setError("Activate your subscription to post.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const fd = new FormData(event.currentTarget);
    const scopeCountry = String(fd.get("country") || "Worldwide");
    const scope = scopeCountry === "Worldwide" ? "worldwide" : "country";
    const payload = {
      kind,
      title: String(fd.get("title") || "").trim(),
      description: String(fd.get("description") || "").trim(),
      scope,
      scope_country: scopeCountry === "Worldwide" ? null : scopeCountry,
      scope_state: String(fd.get("state") || "").trim() || null,
      scope_city: String(fd.get("city") || "").trim() || null,
      payload: kind === "need"
        ? { budget: String(fd.get("budget") || "").trim() || null }
        : { deadline: String(fd.get("deadline") || "").trim() || null },
      links: [
        String(fd.get("link1") || "").trim(),
        String(fd.get("link2") || "").trim(),
      ]
        .filter(Boolean)
        .map((url) => ({ title: kind === "need" ? "Reference" : "Apply", url })),
    };

    apiFetch<{ data: { id: string } }>("/api/posts", {
      method: "POST",
      getToken,
      body: JSON.stringify(payload),
    })
      .then(async () => {
        await refresh();
        await navigate({ to: "/dashboard/needs" });
      })
      .catch((err) => {
        const message = err instanceof ApiError ? err.message : "Could not submit post.";
        setError(message);
      })
      .finally(() => setSubmitting(false));
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <main className="mx-auto max-w-2xl px-4 py-12">
          <h1 className="text-2xl font-bold">Sign in to create a post</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            You need an account to post on Needool. Sign up or log in to continue.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  if (state !== "active") {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <main className="mx-auto max-w-2xl px-4 py-12">
          <h1 className="text-2xl font-bold">Activate your account to post</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Only Active subscribers can post {kind === "need" ? "Need Requests" : "Opportunities"}.
            Visit the pricing page to subscribe.
          </p>
          <a
            href="/pricing"
            className="mt-6 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            See pricing
          </a>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-3xl font-extrabold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>

        <form
          onSubmit={onSubmit}
          className="mt-8 flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <Field label="Title" name="title" required maxLength={80} placeholder={kind === "need" ? "e.g. Need a React dev for a 2-week dashboard build" : "e.g. Lagos creator micro-grant 2026"} />
          <Field
            label="Description"
            name="description"
            required
            multiline
            maxLength={1500}
            placeholder="Describe what you need (or the opportunity). Phone numbers and emails are auto-stripped."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Select label="Country" name="country" defaultValue="Worldwide" options={COUNTRIES} />
            <Field label="State" name="state" placeholder="Lagos" />
            <Field label="City" name="city" placeholder="Ikeja" />
          </div>

          {kind === "need" ? (
            <Field label="Budget (USD)" name="budget" placeholder="e.g. $1,500 - $2,500" />
          ) : (
            <Field label="Deadline" name="deadline" placeholder="e.g. 2026-06-30" type="date" />
          )}

          <Field label="Reference link (optional)" name="link1" placeholder="https://…" />
          <Field label="Additional link (optional)" name="link2" placeholder="https://…" />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit for review"}
          </button>
          <p className="text-center text-xs text-muted-foreground">
            All posts are reviewed by admin before going live.
          </p>
        </form>
      </main>
      <Footer />
    </div>
  );
}

type FieldProps = {
  label: string;
  name: string;
  required?: boolean;
  multiline?: boolean;
  maxLength?: number;
  placeholder?: string;
  type?: string;
};

function Field({ label, name, required, multiline, maxLength, placeholder, type = "text" }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5 text-left">
      <span className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </span>
      {multiline ? (
        <textarea
          name={name}
          required={required}
          maxLength={maxLength}
          placeholder={placeholder}
          rows={6}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          maxLength={maxLength}
          placeholder={placeholder}
          className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
        />
      )}
    </label>
  );
}

type SelectProps = {
  label: string;
  name: string;
  defaultValue?: string;
  options: string[];
};

function Select({ label, name, defaultValue, options }: SelectProps) {
  return (
    <label className="flex flex-col gap-1.5 text-left">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
