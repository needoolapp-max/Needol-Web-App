import { useEffect, useRef, useState, type FormEvent } from "react";
import { X, UserPlus } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import {
  getDashboardDebugSnapshot,
  recordDashboardError,
  recordDashboardEvent,
} from "@/lib/dashboard-debug";

const ONBOARDING_TIMEOUT_MS = 30_000;

function getSavedReferralCode() {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem("ndl_ref") ?? "";
}

function clearSavedReferralCode() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem("ndl_ref");
}

function onboardingTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} took too long. Please check your connection and try again.`));
    }, ONBOARDING_TIMEOUT_MS);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function getFormValue(form: HTMLFormElement, name: string) {
  const value = new FormData(form).get(name);
  return typeof value === "string" ? value : "";
}

export function SafeOnboarding() {
  const { registerProfile } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const formRef = useRef<HTMLFormElement>(null);
  const lastInputLogAt = useRef(0);
  const [onboardError, setOnboardError] = useState("");
  const [onboardLoading, setOnboardLoading] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.add("needool-safe-onboarding");
    recordDashboardEvent("dashboard:onboarding-safe-mounted", { path });
    return () => {
      document.documentElement.classList.remove("needool-safe-onboarding");
    };
  }, [path]);

  function recordInputBreadcrumb(event: string, field?: string) {
    const now = Date.now();
    if (event !== "dashboard:onboarding-field-focus" && now - lastInputLogAt.current < 800) {
      return;
    }
    lastInputLogAt.current = now;
    recordDashboardEvent(event, { path, field });
  }

  async function copyDebugReport() {
    const report = JSON.stringify(getDashboardDebugSnapshot(), null, 2);
    try {
      await navigator.clipboard.writeText(report);
      setOnboardError("Debug report copied. Send it after reloading if the page freezes again.");
    } catch (error) {
      recordDashboardError("dashboard:debug-copy-error", error);
      setOnboardError(
        "Could not copy automatically. Open the console and run window.needoolDebugExport().",
      );
    }
  }

  async function submitOnboarding(e: FormEvent) {
    e.preventDefault();
    const form = formRef.current;
    if (!form) {
      setOnboardError("The setup form is not ready. Reload and try again.");
      return;
    }

    setOnboardError("");
    setOnboardLoading(true);
    recordDashboardEvent("dashboard:onboarding-submit-start", { path });

    const rawAccountType = getFormValue(form, "accountType");
    const accountType: "Individual" | "Business" =
      rawAccountType === "Business" ? "Business" : "Individual";
    const cleanUsername =
      getFormValue(form, "username").trim().toLowerCase().replace(/\s/g, "") || undefined;
    const cleanReferral = getFormValue(form, "referralCode").trim().toUpperCase() || undefined;

    try {
      await onboardingTimeout(
        registerProfile({
          username: cleanUsername,
          accountType,
          referralCode: cleanReferral,
        }),
        "Profile setup",
      );
      clearSavedReferralCode();
      recordDashboardEvent("dashboard:onboarding-submit-success", { path });
    } catch (err) {
      recordDashboardError("dashboard:onboarding-submit-error", err, { path });
      setOnboardError(
        err instanceof Error ? err.message : "Could not save profile. Please try again.",
      );
    } finally {
      setOnboardLoading(false);
    }
  }

  async function skipOnboarding() {
    if (onboardLoading) return;
    setOnboardError("");
    setOnboardLoading(true);
    recordDashboardEvent("dashboard:onboarding-skip-start", { path });
    try {
      const savedRef = getSavedReferralCode() || undefined;
      await onboardingTimeout(
        registerProfile({
          accountType: "Individual",
          referralCode: savedRef ? savedRef.trim().toUpperCase() : undefined,
        }),
        "Skipping setup",
      );
      clearSavedReferralCode();
      recordDashboardEvent("dashboard:onboarding-skip-success", { path });
    } catch (err) {
      recordDashboardError("dashboard:onboarding-skip-error", err, { path });
      setOnboardError(
        err instanceof Error
          ? err.message
          : "Could not finish setup with defaults. Please try again.",
      );
    } finally {
      setOnboardLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between">
          <div className="inline-flex rounded-md bg-primary/10 p-2 text-primary">
            <UserPlus className="h-5 w-5" />
          </div>
          <button
            type="button"
            onClick={skipOnboarding}
            disabled={onboardLoading}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
            title="Skip and use defaults"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h2 className="text-2xl font-extrabold text-foreground">Complete your profile</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose a username to personalise your account. You can update everything later from your
          profile.
        </p>
        <form
          ref={formRef}
          onSubmit={submitOnboarding}
          onFocusCapture={(event) =>
            recordInputBreadcrumb(
              "dashboard:onboarding-field-focus",
              (event.target as HTMLInputElement | HTMLSelectElement).name,
            )
          }
          onInputCapture={(event) =>
            recordInputBreadcrumb(
              "dashboard:onboarding-field-input",
              (event.target as HTMLInputElement | HTMLSelectElement).name,
            )
          }
          className="mt-6 grid gap-4"
        >
          <label className="grid gap-2 text-sm font-semibold">
            Username
            <input
              name="username"
              className="min-h-11 rounded-md border border-border bg-background px-3 py-2.5 font-normal outline-none focus:border-primary"
              placeholder="e.g. jane.smith"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Account type
            <select
              name="accountType"
              defaultValue="Individual"
              className="min-h-11 rounded-md border border-border bg-background px-3 py-2.5 font-normal outline-none focus:border-primary"
            >
              <option>Individual</option>
              <option>Business</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Referral code
            <input
              name="referralCode"
              className="min-h-11 rounded-md border border-border bg-background px-3 py-2.5 font-normal outline-none focus:border-primary"
              placeholder="Optional"
              defaultValue={getSavedReferralCode()}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
            />
          </label>
          {onboardError && (
            <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {onboardError}
            </p>
          )}
          <button
            type="submit"
            disabled={onboardLoading}
            className="min-h-11 w-full rounded-md bg-primary px-4 py-3 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {onboardLoading ? "Saving..." : "Complete setup"}
          </button>
        </form>
        <button
          type="button"
          onClick={skipOnboarding}
          disabled={onboardLoading}
          className="mt-3 w-full rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          Skip for now - I'll update my profile later
        </button>
        <button
          type="button"
          onClick={copyDebugReport}
          className="mt-2 w-full rounded-md px-4 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Copy debug report
        </button>
      </div>
    </div>
  );
}
