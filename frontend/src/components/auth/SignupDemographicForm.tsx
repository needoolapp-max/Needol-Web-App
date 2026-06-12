// PRD §2.3 + §2.4 — demographic / contact fields captured AFTER Clerk auth
// (Phase 9). Output is POSTed to /api/me/onboarding-complete which writes
// the fields onto the users row and flips profile_complete=true.
//
// Phase 10-2 (revisit) — Editorial Trust Ledger styling + searchable
// country/state Comboboxes (so the user doesn't scroll to the bottom of an
// alphabetical list to pick the United States). Nationality field removed:
// it duplicated the Country field for marketplace matching purposes and
// belongs only in the future ID-verification flow.
//
// Freeze-defense tactics (Phase 9 carried forward — DO NOT REMOVE):
//
// 1. autoComplete tokens per field — tells browser autofill engines exactly
//    what each input is so they make a single pass instead of scanning
//    unknown patterns on every keystroke. Critical on iOS Safari and
//    Windows Edge which run autofill JS per-input-event.
//
// 2. name="ndl-..." prefix — non-standard names so 1Password/LastPass etc.
//    don't fingerprint the form as a credential save target on every change.
//
// 3. inputMode hints — mobile keyboards render the right layout immediately
//    and don't re-evaluate on each input event.
//
// 4. Uncontrolled inputs only — no value/onChange on text inputs. React
//    never re-renders on keystroke. Form values are read via FormData at
//    submit time. The two new Comboboxes follow the SAME contract: they
//    manage their own internal state and expose the committed value
//    through a hidden <input> that FormData picks up. The form-level
//    component only re-renders when the user changes country, which then
//    swaps the state Combobox's options (intentional, not per-keystroke).

import { useState, type FormEvent } from "react";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { COUNTRIES, REGIONS_BY_COUNTRY, hasRegions } from "@/lib/locations";

export type AccountType = "Individual" | "Business";

export type OnboardingPayload = {
  accountType: AccountType;
  referredBy?: string;
  // §2.3 Individual
  middleName?: string;
  sex?: "Male" | "Female" | "Other";
  dateOfBirth?: string;
  phone?: string;
  whatsapp?: string;
  country?: string;
  state?: string;
  city?: string;
  // §2.4 Business
  businessAddress?: string;
  officeType?: "HQ" | "Branch";
  hqAddress?: string;
  hqCountry?: string;
  hqState?: string;
  hqCity?: string;
};

// Back-compat: the old name was used by tests + e2e specs.
export type SignupMetadata = OnboardingPayload;

const MIN_AGE = 18;

function isAtLeast18(iso: string): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - MIN_AGE);
  return d.getTime() <= cutoff.getTime();
}

// Country options for the Combobox. Value is the readable country name
// (matches what the backend stored historically as text — keeps the schema
// untouched). Display is the same string.
const COUNTRY_OPTIONS: ComboboxOption[] = COUNTRIES.map((c) => ({
  value: c.name,
  label: c.name,
}));

function regionOptionsFor(countryName: string): ComboboxOption[] {
  const country = COUNTRIES.find((c) => c.name === countryName);
  if (!country) return [];
  const regions = REGIONS_BY_COUNTRY[country.code];
  if (!regions) return [];
  return regions.map((r) => ({ value: r, label: r }));
}

export function SignupDemographicForm({
  defaultReferredBy,
  onSubmit,
  submitting = false,
}: {
  defaultReferredBy?: string | null;
  onSubmit: (data: OnboardingPayload) => void;
  submitting?: boolean;
}) {
  const [accountType, setAccountType] = useState<AccountType>("Individual");
  // Only state we keep on the form: account type (radio) + country (so the
  // state Combobox can swap its options when the country changes). Both
  // change on explicit user action — never per keystroke.
  const [country, setCountry] = useState("");
  const [error, setError] = useState<string | null>(null);

  const regionOptions = regionOptionsFor(country);
  const countryHasRegions =
    country !== "" && hasRegions(
      COUNTRIES.find((c) => c.name === country)?.code ?? "",
    );

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => {
      const v = fd.get(`ndl-${k}`);
      return typeof v === "string" ? v.trim() : "";
    };
    const data: OnboardingPayload = {
      accountType,
      referredBy: get("referred-by") || undefined,
      phone: get("phone") || undefined,
      whatsapp: get("whatsapp") || undefined,
      country: get("country") || undefined,
      state: get("state") || undefined,
      city: get("city") || undefined,
    };
    if (accountType === "Individual") {
      const middleName = get("middle-name");
      const sex = get("sex") as OnboardingPayload["sex"] | "";
      const dob = get("dob");
      if (!dob) {
        setError("Date of birth is required.");
        return;
      }
      if (!isAtLeast18(dob)) {
        setError("You must be at least 18 to sign up.");
        return;
      }
      data.middleName = middleName || undefined;
      data.sex = sex || undefined;
      data.dateOfBirth = dob;
    } else {
      const bizAddr = get("business-address");
      const officeType = get("office-type") as OnboardingPayload["officeType"] | "";
      if (!bizAddr) {
        setError("Business address is required.");
        return;
      }
      data.businessAddress = bizAddr;
      data.officeType = officeType || undefined;
      if (officeType === "Branch") {
        const hqAddr = get("hq-address");
        const hqCountry = get("hq-country");
        if (!hqAddr || !hqCountry) {
          setError("Branch offices must list the HQ full address + country.");
          return;
        }
        data.hqAddress = hqAddr;
        data.hqCountry = hqCountry;
        data.hqState = get("hq-state") || undefined;
        data.hqCity = get("hq-city") || undefined;
      }
    }
    onSubmit(data);
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-8"
      data-test="signup-demographic-form"
      autoComplete="on"
    >
      {/* Account type */}
      <Section number="01" kicker="Identity" title="Tell us who you are.">
        <Field label="Account type">
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
            {(["Individual", "Business"] as const).map((t) => (
              <button
                key={t}
                type="button"
                data-test={`account-type-${t.toLowerCase()}`}
                onClick={() => setAccountType(t)}
                className={`flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
                  accountType === t
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-foreground hover:border-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>

        <Field
          label="Referrer username"
          hint="Optional. Typed referrer overrides any link cookie. Wrong code is silently ignored."
        >
          <input
            name="ndl-referred-by"
            data-test="signup-referred-by"
            autoComplete="off"
            defaultValue={defaultReferredBy ?? ""}
            className={inputClass}
            placeholder="e.g. ADA-CODES"
          />
        </Field>

        {accountType === "Individual" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Middle name" hint="Optional.">
              <input
                name="ndl-middle-name"
                data-test="signup-middle-name"
                autoComplete="additional-name"
                className={inputClass}
              />
            </Field>
            <Field label="Sex">
              <select
                name="ndl-sex"
                data-test="signup-sex"
                autoComplete="sex"
                className={inputClass}
                defaultValue=""
              >
                <option value="">Select…</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field label="Date of birth" hint="Must be 18 or older.">
              <input
                type="date"
                name="ndl-dob"
                data-test="signup-dob"
                autoComplete="bday"
                className={inputClass}
                required
              />
            </Field>
          </div>
        )}
      </Section>

      {/* Location */}
      <Section number="02" kicker="Location" title="Where do you work from?">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Country">
            <Combobox
              name="ndl-country"
              data-test="signup-country"
              options={COUNTRY_OPTIONS}
              placeholder="Select country…"
              searchPlaceholder="Type to search country…"
              required
              onChange={setCountry}
            />
          </Field>
          <Field
            label="State / Region"
            hint={
              country && !countryHasRegions
                ? "Type your region — no preset list for this country yet."
                : undefined
            }
          >
            {countryHasRegions ? (
              <Combobox
                key={country /* reset on country change */}
                name="ndl-state"
                data-test="signup-state"
                options={regionOptions}
                placeholder="Select region…"
                searchPlaceholder="Type to search region…"
                required
              />
            ) : (
              <input
                name="ndl-state"
                data-test="signup-state"
                autoComplete="address-level1"
                className={inputClass}
                placeholder={country ? "e.g. Lagos" : "Select country first"}
                disabled={!country}
                required
              />
            )}
          </Field>
          <Field label="City">
            <input
              name="ndl-city"
              data-test="signup-city"
              autoComplete="address-level2"
              className={inputClass}
              required
            />
          </Field>
          <Field label="Phone">
            <input
              name="ndl-phone"
              data-test="signup-phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              className={inputClass}
              required
            />
          </Field>
          <Field label="WhatsApp" hint="Optional.">
            <input
              name="ndl-whatsapp"
              data-test="signup-whatsapp"
              type="tel"
              autoComplete="off"
              inputMode="tel"
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      {/* Business — only shown when Business is the chosen account type */}
      {accountType === "Business" && (
        <Section number="03" kicker="Workspace" title="Tell us about the business.">
          <Field label="Business address" hint="Street, building.">
            <input
              name="ndl-business-address"
              data-test="signup-business-address"
              autoComplete="street-address"
              className={inputClass}
              required
            />
          </Field>
          <Field label="Office type">
            <select
              name="ndl-office-type"
              data-test="signup-office-type"
              autoComplete="off"
              className={inputClass}
              defaultValue="HQ"
            >
              <option value="HQ">Headquarters</option>
              <option value="Branch">Branch (requires HQ address)</option>
            </select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="HQ address" hint="If branch.">
              <input
                name="ndl-hq-address"
                data-test="signup-hq-address"
                autoComplete="off"
                className={inputClass}
              />
            </Field>
            <Field label="HQ country" hint="If branch.">
              <input
                name="ndl-hq-country"
                data-test="signup-hq-country"
                autoComplete="off"
                className={inputClass}
              />
            </Field>
            <Field label="HQ state" hint="If branch.">
              <input
                name="ndl-hq-state"
                data-test="signup-hq-state"
                autoComplete="off"
                className={inputClass}
              />
            </Field>
            <Field label="HQ city" hint="If branch.">
              <input
                name="ndl-hq-city"
                data-test="signup-hq-city"
                autoComplete="off"
                className={inputClass}
              />
            </Field>
          </div>
        </Section>
      )}

      {error && (
        <p
          data-test="signup-form-error"
          className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        data-test="signup-form-continue"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center rounded-lg bg-foreground px-5 py-3 text-sm font-bold text-background transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {submitting ? "Saving…" : "Continue to dashboard"}
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60";

function Section({
  number,
  kicker,
  title,
  children,
}: {
  number: string;
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-6">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-xs font-semibold tracking-[0.16em] text-foreground">
          {number}
        </span>
        <span className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-foreground/80">
          {kicker}
        </span>
      </div>
      <h2 className="mt-2 font-heading text-lg font-bold tracking-tight text-foreground sm:text-xl">
        {title}
      </h2>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/80">
        {label}
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
