import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, ApiError } from "@/lib/api";

const ALLOWED_PLANS = new Set([
  "individual_monthly",
  "individual_yearly",
  "business_monthly",
  "business_yearly",
]);

function validateSearch(search: Record<string, unknown>) {
  return {
    plan: typeof search.plan === "string" ? search.plan : "",
  };
}

export const Route = createFileRoute("/billing/start")({
  validateSearch,
  component: BillingStart,
});

function BillingStart() {
  const { plan } = Route.useSearch();
  const { getToken, loading, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      void navigate({ to: "/login", replace: true });
      return;
    }
    if (!ALLOWED_PLANS.has(plan)) {
      setError("Unknown plan selected.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await apiFetch<{ data: { invoiceUrl: string | null } }>(
          "/api/subscriptions/initiate",
          {
            method: "POST",
            getToken,
            body: JSON.stringify({ plan }),
          },
        );
        if (cancelled) return;
        const url = result.data.invoiceUrl;
        if (!url) {
          setError("Payment provider did not return a checkout URL.");
          return;
        }
        window.sessionStorage.setItem("ndl_pending_plan", plan);
        window.location.assign(url);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Could not start checkout. Please try again.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, user, plan, getToken, navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        {error ? (
          <>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-destructive">
              Checkout failed
            </p>
            <h1 className="mt-3 font-heading text-2xl font-extrabold tracking-tight text-foreground">
              We couldn't start checkout.
            </h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{error}</p>
            <button
              type="button"
              onClick={() => navigate({ to: "/pricing" })}
              className="mt-6 inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-foreground"
            >
              Back to pricing
            </button>
          </>
        ) : (
          <>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/85">
              Establishing checkout
            </p>
            {/* Boot-preloader-style hairline rail. Pure CSS animation; no
                framer-motion, no JS RAF. */}
            <div className="mx-auto mt-6 h-px w-56 overflow-hidden bg-border">
              <div className="billing-rail h-full bg-[linear-gradient(90deg,var(--color-primary),var(--color-accent))]" />
            </div>
            <h1 className="mt-6 font-heading text-2xl font-extrabold tracking-tight text-foreground">
              Starting checkout.
            </h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Redirecting you to the NOWPayments hosted checkout page.
            </p>
          </>
        )}
      </div>
      <style>{`
        @keyframes ndl-billing-rail {
          0% { width: 0; }
          100% { width: 80%; }
        }
        .billing-rail {
          width: 0;
          animation: ndl-billing-rail 2.5s cubic-bezier(0.2, 0.7, 0.3, 1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .billing-rail { animation: none; width: 80%; }
        }
      `}</style>
    </main>
  );
}
