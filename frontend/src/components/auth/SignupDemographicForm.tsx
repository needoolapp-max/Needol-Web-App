// PRD §2.3 + §2.4 — captures the demographic + contact fields the PRD requires
// at signup. Output gets passed to Clerk's <SignUp unsafeMetadata={...}> so the
// user.created webhook can write them onto the users row server-side.
//
// PRD §2.5 still puts email + password + first/last name in Clerk's own SignUp
// component (Clerk owns the immutable auth pair). This form only collects the
// pieces Clerk doesn't.

import { useState, type FormEvent } from "react";

export type AccountType = "Individual" | "Business";

export type SignupMetadata = {
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
}: {
  defaultReferredBy?: string | null;
  onSubmit: (data: SignupMetadata) => void;
}) {
  const [accountType, setAccountType] = useState<AccountType>("Individual");
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => {
      const v = fd.get(k);
      return typeof v === "string" ? v.trim() : "";
    };
    const data: SignupMetadata = {
      accountType,
      referredBy: get("referredBy") || undefined,
      nationality: get("nationality") || undefined,
      phone: get("phone") || undefined,
      whatsapp: get("whatsapp") || undefined,
      country: get("country") || undefined,
      state: get("state") || undefined,
      city: get("city") || undefined,
    };
    if (accountType === "Individual") {
      const middleName = get("middleName");
      const sex = get("sex") as SignupMetadata["sex"] | "";
      const dob = get("dateOfBirth");
      if (!dob) { setError("Date of birth is required."); return; }
      if (!isAtLeast18(dob)) { setError("You must be at least 18 to sign up."); return; }
      data.middleName = middleName || undefined;
      data.sex = sex || undefined;
      data.dateOfBirth = dob;
    } else {
      const bizAddr = get("businessAddress");
      const officeType = get("officeType") as SignupMetadata["officeType"] | "";
      if (!bizAddr) { setError("Business address is required."); return; }
      data.businessAddress = bizAddr;
      data.officeType = officeType || undefined;
      if (officeType === "Branch") {
        const hqAddr = get("hqAddress");
        const hqCountry = get("hqCountry");
        if (!hqAddr || !hqCountry) {
          setError("Branch offices must list the HQ full address + country.");
          return;
        }
        data.hqAddress = hqAddr;
        data.hqCountry = hqCountry;
        data.hqState = get("hqState") || undefined;
        data.hqCity = get("hqCity") || undefined;
      }
    }
    onSubmit(data);
  }

  return (
    <form onSubmit={submit} className="space-y-4" data-test="signup-demographic-form">
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
          name="referredBy"
          data-test="signup-referred-by"
          defaultValue={defaultReferredBy ?? ""}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
          placeholder="e.g. ADA-CODES"
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Country"><input name="country" data-test="signup-country" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" required /></Field>
        <Field label="State / Region"><input name="state" data-test="signup-state" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" required /></Field>
        <Field label="City"><input name="city" data-test="signup-city" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" required /></Field>
        <Field label="Phone"><input name="phone" data-test="signup-phone" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" required /></Field>
        <Field label="WhatsApp (optional)"><input name="whatsapp" data-test="signup-whatsapp" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" /></Field>
        <Field label="Nationality"><input name="nationality" data-test="signup-nationality" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" required /></Field>
      </div>

      {accountType === "Individual" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Middle name (optional)"><input name="middleName" data-test="signup-middle-name" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" /></Field>
          <Field label="Sex">
            <select name="sex" data-test="signup-sex" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" defaultValue="">
              <option value="">Select…</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </Field>
          <Field label="Date of birth (must be 18+)">
            <input type="date" name="dateOfBirth" data-test="signup-dob" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" required />
          </Field>
        </div>
      ) : (
        <div className="space-y-3">
          <Field label="Business address (street / building)">
            <input name="businessAddress" data-test="signup-business-address" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" required />
          </Field>
          <Field label="Office type">
            <select name="officeType" data-test="signup-office-type" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" defaultValue="HQ">
              <option value="HQ">Headquarters</option>
              <option value="Branch">Branch (requires HQ address)</option>
            </select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="HQ address (if branch)"><input name="hqAddress" data-test="signup-hq-address" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" /></Field>
            <Field label="HQ country"><input name="hqCountry" data-test="signup-hq-country" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" /></Field>
            <Field label="HQ state"><input name="hqState" data-test="signup-hq-state" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" /></Field>
            <Field label="HQ city"><input name="hqCity" data-test="signup-hq-city" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" /></Field>
          </div>
        </div>
      )}

      {error && (
        <p data-test="signup-form-error" className="text-sm text-destructive">{error}</p>
      )}

      <button
        type="submit"
        data-test="signup-form-continue"
        className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Continue to verification
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
