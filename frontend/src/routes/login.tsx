import { SignIn } from "@clerk/clerk-react";
import { createFileRoute } from "@tanstack/react-router";
import { ClerkAuthShell } from "@/components/auth/ClerkAuthShell";
import { HostedClerkRedirect } from "@/components/auth/HostedClerkRedirect";
import { clerkAuthAppearance } from "@/components/auth/clerkAuthAppearance";
import { shouldUseEmbeddedClerk } from "@/lib/clerk-hosted-auth";

function validateLoginSearch(search: Record<string, unknown>) {
  return {
    embedded: typeof search.embedded === "string" ? search.embedded : undefined,
  };
}

export const Route = createFileRoute("/login")({
  validateSearch: validateLoginSearch,
  component: LoginPage,
});

function LoginPage() {
  const { embedded } = Route.useSearch();
  const useEmbedded = shouldUseEmbeddedClerk(embedded);

  return (
    <ClerkAuthShell
      title="Welcome back"
      subtitle="Sign in with Clerk's secure authentication flow and continue to your dashboard."
    >
      {useEmbedded ? (
        <SignIn
          routing="path"
          path="/login"
          signUpUrl="/signup"
          forceRedirectUrl="/dashboard"
          fallbackRedirectUrl="/dashboard"
          appearance={clerkAuthAppearance}
        />
      ) : (
        <HostedClerkRedirect kind="sign-in" embeddedHref="/login?embedded=1" />
      )}
    </ClerkAuthShell>
  );
}
