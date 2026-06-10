// Phase 9 — post-Clerk onboarding. PRD §2.3 + §2.4 demographic capture lives
// here after Clerk authentication completes. Three guards:
//
// 1. Auth gate: only mounted for signed-in Clerk users. Visitor → /login.
// 2. Complete gate: if profile_complete is already true, redirect to
//    /dashboard (prevents users from re-doing onboarding).
// 3. Hard required: there is no Skip button. Dashboard routes redirect back
//    here if profile_complete is false (Phase 9-4 gate).

import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AuthShell } from "@/components/auth/AuthShell";
import { apiFetch, ApiError } from "@/lib/api";
import {
  SignupDemographicForm,
  type OnboardingPayload,
} from "@/components/auth/SignupDemographicForm";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

function useReferralCookie(): string | null {
  const [ref, setRef] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    apiFetch<{ data: { ref: string | null } }>("/api/auth/referrer", {
      method: "GET",
    })
      .then((r) => {
        if (!cancelled) setRef((r.data.ref || "").toUpperCase() || null);
      })
      .catch(() => {
        if (!cancelled) setRef(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return ref;
}

function OnboardingPage() {
  const navigate = useNavigate();
  const { user, loading, refresh, getToken } = useAuth();
  const cookieReferredBy = useReferralCookie();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Guard A: visitor → /login. Wait for AuthContext to finish loading
  // before deciding (otherwise we'd flicker to /login during initial
  // session restore).
  useEffect(() => {
    if (loading) return;
    if (!user) {
      void navigate({ to: "/login" });
    }
  }, [loading, user, navigate]);

  // Guard B: already onboarded → /dashboard.
  useEffect(() => {
    if (loading || !user) return;
    if (user.profileComplete) {
      void navigate({ to: "/dashboard" });
    }
  }, [loading, user, navigate]);

  async function handleSubmit(data: OnboardingPayload) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await apiFetch("/api/me/onboarding-complete", {
        method: "POST",
        body: JSON.stringify(data),
        getToken,
      });
      // Refresh AuthContext so /dashboard sees profile_complete=true.
      await refresh();
      await navigate({ to: "/dashboard" });
    } catch (e) {
      setSubmitError(
        e instanceof ApiError
          ? e.message
          : "Could not save your details. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // While loading auth state or after a guard fires, render a minimal
  // shell so we don't flash the form to a visitor or to an already-
  // onboarded user.
  if (loading || !user || user.profileComplete) {
    return (
      <AuthShell title="One moment" subtitle="Checking your account…">
        <div className="flex justify-center py-6">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Tell us about you"
      subtitle="One more step before your dashboard. PRD §2.3 / §2.4 fields — these become part of your profile."
    >
      <div className="space-y-4">
        <SignupDemographicForm
          defaultReferredBy={cookieReferredBy}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
        {submitError && (
          <p data-test="onboarding-submit-error" className="text-sm text-destructive">
            {submitError}
          </p>
        )}
      </div>
    </AuthShell>
  );
}
