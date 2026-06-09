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
      <div className="max-w-md text-center">
        {error ? (
          <>
            <h1 className="text-xl font-semibold text-foreground">Checkout failed</h1>
            <p className="mt-3 text-sm text-muted-foreground">{error}</p>
            <button
              type="button"
              onClick={() => navigate({ to: "/pricing" })}
              className="mt-6 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
            >
              Back to pricing
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <h1 className="mt-6 text-xl font-semibold text-foreground">Starting checkout…</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Redirecting you to the NOWPayments hosted checkout page.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
