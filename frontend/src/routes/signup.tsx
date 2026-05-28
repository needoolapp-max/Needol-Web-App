import { useEffect } from "react";
import { SignUp } from "@clerk/clerk-react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ClerkAuthShell } from "@/components/auth/ClerkAuthShell";
import { clerkAuthAppearance } from "@/components/auth/clerkAuthAppearance";

const signupSearchSchema = z.object({
  ref: z.string().optional(),
});

export const Route = createFileRoute("/signup")({
  validateSearch: signupSearchSchema,
  component: SignupPage,
});

function SignupPage() {
  const { ref } = Route.useSearch();

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
      <SignUp
        routing="path"
        path="/signup"
        signInUrl="/login"
        forceRedirectUrl="/dashboard"
        fallbackRedirectUrl="/dashboard"
        appearance={clerkAuthAppearance}
      />
    </ClerkAuthShell>
  );
}
