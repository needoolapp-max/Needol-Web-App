import { createFileRoute } from "@tanstack/react-router";
import { SignIn } from "@clerk/clerk-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { getClerkAppearance } from "@/lib/clerk-appearance";
import { useThemeMode } from "@/context/ThemeContext";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { mode } = useThemeMode();
  return (
    <AuthShell title="Welcome back." subtitle="Sign in to continue to your dashboard.">
      <SignIn
        routing="virtual"
        signUpUrl="/signup"
        fallbackRedirectUrl="/dashboard"
        appearance={getClerkAppearance(mode)}
      />
    </AuthShell>
  );
}
