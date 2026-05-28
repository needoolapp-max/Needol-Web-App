import { useEffect } from "react";
import { SignUp } from "@clerk/clerk-react";
import { createFileRoute } from "@tanstack/react-router";
import { ClerkAuthShell } from "@/components/auth/ClerkAuthShell";
import { HostedClerkRedirect } from "@/components/auth/HostedClerkRedirect";
import { clerkAuthAppearance } from "@/components/auth/clerkAuthAppearance";
import { shouldUseEmbeddedClerk } from "@/lib/clerk-hosted-auth";

function validateSignupSearch(search: Record<string, unknown>) {
  return {
    embedded: typeof search.embedded === "string" ? search.embedded : undefined,
    ref: typeof search.ref === "string" ? search.ref : undefined,
  };
}

export const Route = createFileRoute("/signup")({
  validateSearch: validateSignupSearch,
  component: SignupPage,
});

function SignupPage() {
  const { embedded, ref } = Route.useSearch();
  const useEmbedded = shouldUseEmbeddedClerk(embedded);

  useEffect(() => {
    const cleanedRef = ref?.trim().toUpperCase();
    if (!cleanedRef) return;
    window.sessionStorage.setItem("ndl_ref", cleanedRef);
  }, [ref]);

  return (
    <ClerkAuthShell
      title="Create your Needool account"
      subtitle="Use the secure Clerk signup flow. Referral links are saved automatically before authentication."
    >
      {useEmbedded ? (
        <SignUp
          routing="path"
          path="/signup"
          signInUrl="/login"
          forceRedirectUrl="/dashboard"
          fallbackRedirectUrl="/dashboard"
          appearance={clerkAuthAppearance}
        />
      ) : (
        <HostedClerkRedirect
          kind="sign-up"
          embeddedHref={
            ref ? `/signup?ref=${encodeURIComponent(ref)}&embedded=1` : "/signup?embedded=1"
          }
        />
      )}
    </ClerkAuthShell>
  );
}
