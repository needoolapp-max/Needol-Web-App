import { createFileRoute } from "@tanstack/react-router";
import { SignUp } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { apiFetch } from "@/lib/api";
import {
  SignupDemographicForm,
  type SignupMetadata,
} from "@/components/auth/SignupDemographicForm";

function validateSignupSearch(search: Record<string, unknown>): { ref?: string } {
  const out: { ref?: string } = {};
  if (typeof search.ref === "string") out.ref = search.ref;
  return out;
}

export const Route = createFileRoute("/signup")({
  validateSearch: validateSignupSearch,
  component: SignupPage,
});

// PRD §2.7 + Phase 8-9 — referrer is held in an HttpOnly cookie set by the
// backend. The frontend NEVER reads document.cookie for this (XSS-exfil
// protection); we round-trip via GET /api/auth/referrer instead. When a
// fresh `?ref=` query param arrives, we POST to /api/auth/referrer/set so
// the cookie is written with a 30-day max-age, then drop the param from
// the URL.
function useReferral(searchRef: string | undefined): string | null {
  const [ref, setRef] = useState<string | null>(null);
  useEffect(() => {
    const fromSearch = searchRef?.trim().toUpperCase();
    let cancelled = false;
    (async () => {
      if (fromSearch) {
        try {
          await apiFetch("/api/auth/referrer/set", {
            method: "POST",
            body: JSON.stringify({ ref: fromSearch }),
          });
        } catch {
          /* silently ignored — PRD §2.7 silent-drop policy applies */
        }
        if (!cancelled) setRef(fromSearch);
        return;
      }
      try {
        const r = await apiFetch<{ data: { ref: string | null } }>(
          "/api/auth/referrer",
          { method: "GET" },
        );
        if (!cancelled) setRef((r.data.ref || "").toUpperCase() || null);
      } catch {
        if (!cancelled) setRef(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchRef]);
  return ref;
}

function SignupPage() {
  const { ref } = Route.useSearch();
  const cookieReferredBy = useReferral(ref);
  const [metadata, setMetadata] = useState<SignupMetadata | null>(null);

  if (!metadata) {
    return (
      <AuthShell
        title="Tell us about you"
        subtitle="We capture this once at signup per PRD §2.3 / §2.4. These fields are immutable afterward."
      >
        <SignupDemographicForm
          defaultReferredBy={cookieReferredBy}
          onSubmit={(data) => setMetadata({ ...data, referredByCookie: cookieReferredBy ?? undefined } as SignupMetadata)}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your Needool account"
      subtitle="Verify your email to finish. Your demographic details are saved on the next step."
    >
      <div className="flex justify-center" data-test="signup-clerk-step">
        <SignUp
          routing="virtual"
          signInUrl="/login"
          fallbackRedirectUrl="/dashboard"
          unsafeMetadata={metadata as unknown as Record<string, unknown>}
        />
      </div>
      <button
        onClick={() => setMetadata(null)}
        className="mt-4 block w-full text-center text-xs text-muted-foreground underline"
      >
        Back to demographic details
      </button>
    </AuthShell>
  );
}
