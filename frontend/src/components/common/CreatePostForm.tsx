import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { TopNav } from "@/components/nav/TopNav";
import { Footer } from "@/components/nav/Footer";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
  COUNTRIES as ALL_COUNTRIES,
  REGIONS_BY_COUNTRY,
  hasRegions,
} from "@/lib/locations";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, ApiError } from "@/lib/api";

// Phase 10-2 — Editorial Trust Ledger pass. Form wrapper rounded-2xl
// bg-card shadow-sm chrome dropped. Numbered sections (01 Post, 02
// Location, 03 Links) inline at the top of the form. Country picker is
// now the searchable Combobox shared with the onboarding form; state
// picker auto-swaps to a Combobox when the chosen country has bundled
// region data (Nigeria, US, UK, …) and falls back to a free-text input
// otherwise. Inputs match the SignupDemographicForm `inputClass`
// pattern, submit is dark monochrome ink-on-foreground.

type Kind = "need" | "opportunity";

type Props = {
  kind: Kind;
  title: string;
  subtitle: string;
};

const COUNTRY_OPTIONS: ComboboxOption[] = [
  { value: "Worldwide", label: "Worldwide" },
  ...ALL_COUNTRIES.map((c) => ({ value: c.name, label: c.name })),
];

function regionOptionsFor(countryName: string): ComboboxOption[] {
  const country = ALL_COUNTRIES.find((c) => c.name === countryName);
  if (!country) return [];
  const regions = REGIONS_BY_COUNTRY[country.code];
  if (!regions) return [];
  return regions.map((r) => ({ value: r, label: r }));
}

const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const LABEL_CLASS =
  "font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/80";

export function CreatePostForm({ kind, title, subtitle }: Props) {
  const { user, state, getToken, refresh } = useAuth();
  const navigate = useNavigate();
  const [country, setCountry] = useState("Worldwide");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const countryHasRegions =
    country !== "" &&
    country !== "Worldwide" &&
    hasRegions(
      ALL_COUNTRIES.find((c) => c.name === country)?.code ?? "",
    );

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
          <EditorialMasthead
            kicker="Sign in"
            title="Sign in to create a post."
            sub="You need an account to post on Needool. Sign up or log in to continue."
          />
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
          <EditorialMasthead
            kicker="Subscription required"
            title="Activate your account to post."
            sub={`Only Active subscribers can post ${
              kind === "need" ? "Need Requests" : "Opportunities"
            }. Visit the pricing page to subscribe.`}
          />
          <div className="mt-8">
            <Link
              to="/pricing"
              className="inline-flex min-h-11 items-center rounded-lg bg-foreground px-5 py-3 text-sm font-bold text-background transition-opacity hover:opacity-90"
            >
              See pricing
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <EditorialMasthead kicker="Create" title={title} sub={subtitle} />

        <form onSubmit={onSubmit} className="mt-10 space-y-8">
          <Section number="01" kicker="Post">
            <Field
              label="Title"
              name="title"
              required
              maxLength={80}
              placeholder={
                kind === "need"
                  ? "e.g. Need a React dev for a 2-week dashboard build"
                  : "e.g. Lagos creator micro-grant 2026"
              }
            />
            <Field
              label="Description"
              name="description"
              required
              multiline
              maxLength={1500}
              placeholder="Describe what you need (or the opportunity). Phone numbers and emails are auto-stripped."
            />
            {kind === "need" ? (
              <Field
                label="Budget (USD)"
                name="budget"
                placeholder="e.g. $1,500 - $2,500"
              />
            ) : (
              <Field
                label="Deadline"
                name="deadline"
                placeholder="e.g. 2026-06-30"
                type="date"
              />
            )}
          </Section>

          <Section number="02" kicker="Location">
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldWrapper label="Country">
                <Combobox
                  name="country"
                  options={COUNTRY_OPTIONS}
                  defaultValue="Worldwide"
                  placeholder="Select country…"
                  searchPlaceholder="Type to search country…"
                  onChange={setCountry}
                />
              </FieldWrapper>
              <FieldWrapper
                label="State / Region"
                hint={
                  country &&
                  country !== "Worldwide" &&
                  !countryHasRegions
                    ? "Type your region — no preset list for this country yet."
                    : undefined
                }
              >
                {countryHasRegions ? (
                  <Combobox
                    key={country}
                    name="state"
                    options={regionOptionsFor(country)}
                    placeholder="Select region…"
                    searchPlaceholder="Type to search region…"
                  />
                ) : (
                  <input
                    name="state"
                    placeholder={
                      country && country !== "Worldwide" ? "e.g. Lagos" : "—"
                    }
                    disabled={!country || country === "Worldwide"}
                    className={INPUT_CLASS}
                  />
                )}
              </FieldWrapper>
              <FieldWrapper label="City">
                <input
                  name="city"
                  placeholder="Ikeja"
                  className={INPUT_CLASS}
                />
              </FieldWrapper>
            </div>
          </Section>

          <Section number="03" kicker="Links">
            <Field
              label="Reference link"
              hint="Optional."
              name="link1"
              placeholder="https://…"
            />
            <Field
              label="Additional link"
              hint="Optional."
              name="link2"
              placeholder="https://…"
            />
          </Section>

          {error && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full min-h-11 items-center justify-center rounded-lg bg-foreground px-5 py-3 text-sm font-bold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit for review"}
          </button>
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            All posts are reviewed by admin before going live
          </p>
        </form>
      </main>
      <Footer />
    </div>
  );
}

function EditorialMasthead({
  kicker,
  title,
  sub,
}: {
  kicker: string;
  title: string;
  sub: string;
}) {
  return (
    <header className="border-t-2 border-foreground pt-6">
      <div className="flex items-baseline gap-4">
        <span
          aria-hidden
          className="font-mono text-sm font-semibold tracking-[0.16em] text-foreground"
        >
          01
        </span>
        <span className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-foreground/85">
          {kicker}
        </span>
      </div>
      <h1 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{sub}</p>
    </header>
  );
}

function Section({
  number,
  kicker,
  children,
}: {
  number: string;
  kicker: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-6">
      <div className="flex items-baseline gap-3">
        <span
          aria-hidden
          className="font-mono text-xs font-semibold tracking-[0.16em] text-foreground"
        >
          {number}
        </span>
        <span className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-foreground/80">
          {kicker}
        </span>
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
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
  hint?: string;
};

function Field({
  label,
  name,
  required,
  multiline,
  maxLength,
  placeholder,
  type = "text",
  hint,
}: FieldProps) {
  return (
    <FieldWrapper label={label} required={required} hint={hint}>
      {multiline ? (
        <textarea
          name={name}
          required={required}
          maxLength={maxLength}
          placeholder={placeholder}
          rows={6}
          className={INPUT_CLASS}
        />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          maxLength={maxLength}
          placeholder={placeholder}
          className={INPUT_CLASS}
        />
      )}
    </FieldWrapper>
  );
}

function FieldWrapper({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={LABEL_CLASS}>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </span>
      {hint && (
        <span className="mt-0.5 block text-[11px] leading-5 text-muted-foreground">
          {hint}
        </span>
      )}
      <div className="mt-2">{children}</div>
    </label>
  );
}
