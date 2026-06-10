// PRD §2.3 + §2.4 — demographic / contact fields captured AFTER Clerk auth
// (Phase 9). Output is POSTed to /api/me/onboarding-complete which writes the
// fields onto the users row and flips profile_complete=true.
//
// Freeze-defense tactics (Phase 9 — see signup.tsx prelude for full rationale):
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
//    (`tel` for phone, `email` for email) and the OS doesn't re-evaluate
//    keyboard layout on every input change.
//
// 4. Uncontrolled inputs only — no value/onChange so React never re-renders
//    on keystroke. The only state is accountType (radio) and error message.

import { useState, type FormEvent } from "react";

export type AccountType = "Individual" | "Business";

export type OnboardingPayload = {
  accountType: AccountType;
  referredBy?: string;
  // §2.3 Individual
  middleName?: string;
  sex?: "Male" | "Female" | "Other";
  nationality?: string;
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
  const [error, setError] = useState<string | null>(null);

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
      nationality: get("nationality") || undefined,
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
      if (!dob) { setError("Date of birth is required."); return; }
      if (!isAtLeast18(dob)) { setError("You must be at least 18 to sign up."); return; }
      data.middleName = middleName || undefined;
      data.sex = sex || undefined;
      data.dateOfBirth = dob;
    } else {
      const bizAddr = get("business-address");
      const officeType = get("office-type") as OnboardingPayload["officeType"] | "";
      if (!bizAddr) { setError("Business address is required."); return; }
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
      className="space-y-4"
      data-test="signup-demographic-form"
      autoComplete="on"
    >
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account type</label>
        <div className="mt-2 flex gap-2" role="radiogroup">
          {(["Individual", "Business"] as const).map((t) => (
            <button
              key={t}
              type="button"
              data-test={`account-type-${t.toLowerCase()}`}
              onClick={() => setAccountType(t)}
              className={`flex-1 rounded-xl border px-4 py-2 text-sm font-semibold ${
                accountType === t
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card hover:bg-muted"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <Field label="Referrer username (optional)" hint="Typed referrer overrides any link cookie. Wrong code is silently ignored.">
        <input
          name="ndl-referred-by"
          data-test="signup-referred-by"
          autoComplete="off"
          defaultValue={defaultReferredBy ?? ""}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
          placeholder="e.g. ADA-CODES"
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Country">
          <input
            name="ndl-country"
            data-test="signup-country"
            autoComplete="country-name"
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
            required
          />
        </Field>
        <Field label="State / Region">
          <input
            name="ndl-state"
            data-test="signup-state"
            autoComplete="address-level1"
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
            required
          />
        </Field>
        <Field label="City">
          <input
            name="ndl-city"
            data-test="signup-city"
            autoComplete="address-level2"
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
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
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
            required
          />
        </Field>
        <Field label="WhatsApp (optional)">
          <input
            name="ndl-whatsapp"
            data-test="signup-whatsapp"
            type="tel"
            autoComplete="off"
            inputMode="tel"
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Nationality">
          <input
            name="ndl-nationality"
            data-test="signup-nationality"
            autoComplete="off"
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
            required
          />
        </Field>
      </div>

      {accountType === "Individual" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Middle name (optional)">
            <input
              name="ndl-middle-name"
              data-test="signup-middle-name"
              autoComplete="additional-name"
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Sex">
            <select
              name="ndl-sex"
              data-test="signup-sex"
              autoComplete="sex"
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="">Select…</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </Field>
          <Field label="Date of birth (must be 18+)">
            <input
              type="date"
              name="ndl-dob"
              data-test="signup-dob"
              autoComplete="bday"
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
              required
            />
          </Field>
        </div>
      ) : (
        <div className="space-y-3">
          <Field label="Business address (street / building)">
            <input
              name="ndl-business-address"
              data-test="signup-business-address"
              autoComplete="street-address"
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
              required
            />
          </Field>
          <Field label="Office type">
            <select
              name="ndl-office-type"
              data-test="signup-office-type"
              autoComplete="off"
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
              defaultValue="HQ"
            >
              <option value="HQ">Headquarters</option>
              <option value="Branch">Branch (requires HQ address)</option>
            </select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="HQ address (if branch)">
              <input
                name="ndl-hq-address"
                data-test="signup-hq-address"
                autoComplete="off"
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
              />
            </Field>
            <Field label="HQ country">
              <input
                name="ndl-hq-country"
                data-test="signup-hq-country"
                autoComplete="off"
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
              />
            </Field>
            <Field label="HQ state">
              <input
                name="ndl-hq-state"
                data-test="signup-hq-state"
                autoComplete="off"
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
              />
            </Field>
            <Field label="HQ city">
              <input
                name="ndl-hq-city"
                data-test="signup-hq-city"
                autoComplete="off"
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
              />
            </Field>
          </div>
        </div>
      )}

      {error && (
        <p data-test="signup-form-error" className="text-sm text-destructive">{error}</p>
      )}

      <button
        type="submit"
        data-test="signup-form-continue"
        disabled={submitting}
        className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {submitting ? "Saving…" : "Continue to dashboard"}
      </button>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {hint && <small className="block text-[11px] text-muted-foreground">{hint}</small>}
      <div className="mt-1">{children}</div>
    </label>
  );
}
