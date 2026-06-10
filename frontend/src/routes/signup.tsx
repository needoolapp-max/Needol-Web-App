// PRD §2.3-§2.5 — Clerk-first signup. The demographic / referrer / account-
// type fields live on `/onboarding` (Phase 9) which runs AFTER Clerk's signup
// completes. Rationale:
//
// • UX: Clerk-first matches every modern OAuth signup pattern (Google then
//   account-detail capture). Users authenticate with Gmail in one click, then
//   fill in the marketplace-specific fields.
// • Performance: the demographic form is heavy (13 fields + radios). When it
//   lived on /signup alongside ClerkProvider's token-refresh worker, the
//   combined main-thread load froze input on Windows / iPhone Safari (worker
//   postMessage + browser autofill engine racing input events). Isolating
//   it to /onboarding eliminates that race because Clerk's worker is in
//   steady state once the user is signed in.
//
// The referrer cookie is still set here (PRD §2.7 — 30-day cookie window).
// `/onboarding` reads it back and offers it as the default referredBy.

import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SignUp } from "@clerk/clerk-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { apiFetch } from "@/lib/api";

function validateSignupSearch(search: Record<string, unknown>): { ref?: string } {
  const out: { ref?: string } = {};
  if (typeof search.ref === "string") out.ref = search.ref;
  return out;
}

export const Route = createFileRoute("/signup")({
  validateSearch: validateSignupSearch,
  component: SignupPage,
});

// PRD §2.7 + Phase 8-9 — fire-and-forget: if a `?ref=` param arrived, write
// the HttpOnly referrer cookie via the backend so /onboarding can read it
// back regardless of how many tabs / navigations happen between now and
// onboarding completion.
function useStashReferral(ref: string | undefined) {
  useEffect(() => {
    if (!ref) return;
    apiFetch("/api/auth/referrer/set", {
      method: "POST",
      body: JSON.stringify({ ref: ref.trim().toUpperCase() }),
    }).catch(() => {
      /* silent — PRD §2.7 silent-drop policy */
    });
  }, [ref]);
}

function SignupPage() {
  const { ref } = Route.useSearch();
  useStashReferral(ref);

  return (
    <AuthShell
      title="Create your Needool account"
      subtitle="One step — verify your email or sign up with Google. We'll capture profile details after."
    >
      <div className="flex justify-center" data-test="signup-clerk-step">
        <SignUp
          routing="virtual"
          signInUrl="/login"
          fallbackRedirectUrl="/onboarding"
        />
      </div>
    </AuthShell>
  );
}
