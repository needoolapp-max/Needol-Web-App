import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TopNav } from "@/components/nav/TopNav";
import { Footer } from "@/components/nav/Footer";
import { apiFetch, ApiError } from "@/lib/api";

export const Route = createFileRoute("/jobs/hire-request")({
  head: () => ({ meta: [{ title: "Submit a Hire Request - Needool" }] }),
  component: HireRequestPage,
});

function HireRequestPage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // PRD §8.1 — contact email must clear an OTP before the form submits.
  const [otpStage, setOtpStage] = useState<"idle" | "sent" | "verified">("idle");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpVerificationId, setOtpVerificationId] = useState<string | null>(null);
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  async function requestOtp() {
    if (!otpEmail.trim()) {
      setOtpError("Enter a contact email first.");
      return;
    }
    setOtpBusy(true);
    setOtpError(null);
    try {
      await apiFetch("/api/hire-requests/otp/request", {
        method: "POST",
        body: JSON.stringify({ email: otpEmail.trim().toLowerCase() }),
      });
      setOtpStage("sent");
    } catch (err) {
      setOtpError(err instanceof ApiError ? err.message : "Could not send code. Try again.");
    } finally {
      setOtpBusy(false);
    }
  }

  async function verifyOtp() {
    if (!/^\d{6}$/.test(otpCode)) {
      setOtpError("Enter the 6-digit code.");
      return;
    }
    setOtpBusy(true);
    setOtpError(null);
    try {
      const r = await apiFetch<{ data: { id: string } }>(
        "/api/hire-requests/otp/verify",
        {
          method: "POST",
          body: JSON.stringify({
            email: otpEmail.trim().toLowerCase(),
            code: otpCode,
          }),
        },
      );
      setOtpVerificationId(r.data.id);
      setOtpStage("verified");
    } catch (err) {
      setOtpError(err instanceof ApiError ? err.message : "Could not verify code.");
    } finally {
      setOtpBusy(false);
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!otpVerificationId) {
      setError("Verify your contact email first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const fd = new FormData(event.currentTarget);
    const body = {
      employer_name: String(fd.get("employer_name") || ""),
      employer_website: String(fd.get("employer_website") || ""),
      contact_name: String(fd.get("contact_name") || ""),
      contact_email: otpEmail.trim().toLowerCase(),
      contact_phone: String(fd.get("contact_phone") || ""),
      contact_whatsapp: String(fd.get("contact_whatsapp") || ""),
      role_title: String(fd.get("role_title") || ""),
      num_hires: Number(fd.get("num_hires") || 1),
      account_type_pref: String(fd.get("account_type_pref") || "Both"),
      employment_type: String(fd.get("employment_type") || "remote"),
      location: String(fd.get("location") || ""),
      job_description: String(fd.get("job_description") || ""),
      qualifications: String(fd.get("qualifications") || ""),
      salary_usd: Number(fd.get("salary_usd") || 0),
      other_benefits: String(fd.get("other_benefits") || ""),
      notes: String(fd.get("notes") || ""),
      otp_verification_id: otpVerificationId,
    };

    apiFetch<{ data: { id: string } }>("/api/hire-requests", {
      method: "POST",
      body: JSON.stringify(body),
    })
      .then(() => setSubmitted(true))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Failed to submit. Try again.");
      })
      .finally(() => setSubmitting(false));
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-extrabold text-foreground">Submit a hire request</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Needool's end-to-end hiring service starts at <strong>$500</strong>. By submitting, you agree to receive a quote and pay before the role is published.
        </p>

        {submitted ? (
          <div className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center">
            <h2 className="text-xl font-bold text-foreground">Request received</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We'll review and email a quote to your contact email within 1 business day. Watch your inbox for a NOWPayments checkout link.
            </p>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="mt-8 flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <Section title="Employer">
              <Field label="Employer / Organisation name" name="employer_name" required />
              <Field label="Website" name="employer_website" placeholder="https://" />
            </Section>

            <Section title="Contact">
              <Field label="Contact name" name="contact_name" />
              <div className="sm:col-span-2 flex flex-col gap-2" data-test="hire-otp-block">
                <label className="text-sm font-medium text-foreground">
                  Contact email <span className="ml-1 text-destructive">*</span>
                </label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="email"
                    required
                    value={otpEmail}
                    onChange={(e) => { setOtpEmail(e.target.value); setOtpStage("idle"); setOtpVerificationId(null); }}
                    disabled={otpStage === "verified"}
                    data-test="hire-otp-email"
                    className="min-h-11 flex-1 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary disabled:opacity-60"
                  />
                  {otpStage === "verified" ? (
                    <span data-test="hire-otp-verified" className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                      Verified
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={requestOtp}
                      disabled={otpBusy || !otpEmail.trim()}
                      data-test="hire-otp-send"
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-primary bg-background px-3 text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-60"
                    >
                      {otpStage === "sent" ? "Resend code" : "Send code"}
                    </button>
                  )}
                </div>
                {otpStage === "sent" && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center" data-test="hire-otp-verify-block">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="\d{6}"
                      placeholder="6-digit code"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      data-test="hire-otp-code"
                      className="min-h-11 flex-1 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={verifyOtp}
                      disabled={otpBusy || otpCode.length !== 6}
                      data-test="hire-otp-verify"
                      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    >
                      Verify code
                    </button>
                  </div>
                )}
                {otpError && (
                  <p data-test="hire-otp-error" className="text-sm text-destructive">{otpError}</p>
                )}
                {otpStage === "idle" && !otpError && (
                  <p className="text-xs text-muted-foreground">We'll send a one-time 6-digit code to confirm this is your email.</p>
                )}
              </div>
              <Field label="Contact phone" name="contact_phone" />
              <Field label="WhatsApp" name="contact_whatsapp" />
            </Section>

            <Section title="Role">
              <Field label="Role title" name="role_title" required placeholder="e.g. Frontend Engineer" />
              <Field label="Number of hires" name="num_hires" type="number" defaultValue="1" />
              <Select label="Eligible account type" name="account_type_pref" defaultValue="Both" options={["Both", "Individual", "Business"]} />
              <Select label="Employment type" name="employment_type" defaultValue="remote" options={["remote", "onsite", "hybrid"]} />
              <Field label="Location (if on-site or hybrid)" name="location" placeholder="Lagos, Nigeria" />
              <Field label="Salary (USD)" name="salary_usd" type="number" placeholder="e.g. 2500" />
            </Section>

            <Section title="Details">
              <Field label="Job description" name="job_description" required multiline />
              <Field label="Qualifications" name="qualifications" multiline />
              <Field label="Other benefits" name="other_benefits" multiline />
              <Field label="Notes for our team" name="notes" multiline />
            </Section>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={submitting || otpStage !== "verified"}
              data-test="hire-submit"
              className="mt-2 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {submitting ? "Submitting…" : otpStage === "verified" ? "Submit request" : "Verify email to enable submit"}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              An admin will review and email a payment link. Quote is valid for 14 days.
            </p>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4 sm:grid-cols-2">
      <legend className="col-span-full text-xs font-bold uppercase tracking-wider text-primary">{title}</legend>
      {children}
    </fieldset>
  );
}

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  multiline?: boolean;
  placeholder?: string;
  defaultValue?: string;
};

function Field({ label, name, type = "text", required, multiline, placeholder, defaultValue }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5 text-left sm:col-span-2 [&.compact]:sm:col-span-1">
      <span className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </span>
      {multiline ? (
        <textarea
          name={name}
          required={required}
          placeholder={placeholder}
          rows={4}
          defaultValue={defaultValue}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          placeholder={placeholder}
          defaultValue={defaultValue}
          className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
        />
      )}
    </label>
  );
}

type SelectProps = {
  label: string;
  name: string;
  options: string[];
  defaultValue?: string;
};

function Select({ label, name, options, defaultValue }: SelectProps) {
  return (
    <label className="flex flex-col gap-1.5 text-left">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}
