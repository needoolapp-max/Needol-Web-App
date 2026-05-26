import { createFileRoute } from "@tanstack/react-router";
import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";

export const Route = createFileRoute("/sso-callback")({
  head: () => ({ meta: [{ title: "Signing in… - Needool" }] }),
  component: SsoCallbackPage,
});

function SsoCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
