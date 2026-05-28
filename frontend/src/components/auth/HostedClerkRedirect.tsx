import { useEffect, useMemo, useState } from "react";
import { RedirectToSignIn, RedirectToSignUp, useUser } from "@clerk/clerk-react";
import { useNavigate } from "@tanstack/react-router";
import { ExternalLink, Loader2 } from "lucide-react";
import { getExplicitClerkHostedAuthUrl, type ClerkAuthKind } from "@/lib/clerk-hosted-auth";
import { recordDashboardEvent } from "@/lib/dashboard-debug";

type HostedClerkRedirectProps = {
  embeddedHref: string;
  kind: ClerkAuthKind;
};

export function HostedClerkRedirect({ embeddedHref, kind }: HostedClerkRedirectProps) {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn, user } = useUser();
  const [redirectFailed, setRedirectFailed] = useState(false);
  const redirectUrl = useMemo(() => `${window.location.origin}/dashboard`, []);
  const explicitHostedUrl = useMemo(() => getExplicitClerkHostedAuthUrl(kind), [kind]);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      recordDashboardEvent("auth:hosted-already-signed-in", { clerkId: user?.id ?? null });
      void navigate({ to: "/dashboard", replace: true });
      return;
    }

    if (explicitHostedUrl) {
      recordDashboardEvent("auth:hosted-redirect", {
        kind,
        strategy: "explicit-hard-redirect",
        host: new URL(explicitHostedUrl).host,
      });
      const fallback = window.setTimeout(() => setRedirectFailed(true), 2500);
      window.location.assign(explicitHostedUrl);
      return () => window.clearTimeout(fallback);
    }

    recordDashboardEvent("auth:hosted-redirect", { kind, strategy: "clerk-sdk" });
    const fallback = window.setTimeout(() => setRedirectFailed(true), 2500);
    return () => window.clearTimeout(fallback);
  }, [explicitHostedUrl, isLoaded, isSignedIn, kind, navigate, user?.id]);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
      {isLoaded &&
        !isSignedIn &&
        !explicitHostedUrl &&
        (kind === "sign-in" ? (
          <RedirectToSignIn redirectUrl={redirectUrl} />
        ) : (
          <RedirectToSignUp redirectUrl={redirectUrl} />
        ))}

      <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-foreground">
        {kind === "sign-in" ? "Opening secure sign in" : "Opening secure sign up"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Clerk is choosing the correct hosted auth page for this environment, then returning you to
        the dashboard.
      </p>

      <div className="mt-5 flex flex-col gap-3">
        {explicitHostedUrl && (
          <a
            href={explicitHostedUrl}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Continue securely
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
        <a
          href={embeddedHref}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:border-primary hover:text-primary"
        >
          Use embedded form
        </a>
      </div>

      {redirectFailed && (
        <p className="mt-4 text-xs leading-5 text-destructive">
          Automatic redirect did not start. Use the continue button, or use the embedded form while
          checking the Account Portal domain in Clerk.
        </p>
      )}
    </div>
  );
}
