import { createFileRoute } from "@tanstack/react-router";
import { SignIn } from "@clerk/clerk-react";
import { AuthShell } from "@/components/auth/AuthShell";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue to your dashboard.">
      <div className="flex justify-center">
        <SignIn
          routing="virtual"
          signUpUrl="/signup"
          fallbackRedirectUrl="/dashboard"
        />
      </div>
    </AuthShell>
  );
}
