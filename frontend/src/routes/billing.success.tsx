import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useUser } from "@clerk/clerk-react";
import { useAuth, type SubscriptionSummary } from "@/context/AuthContext";
import { API_BASE_URL, apiFetch } from "@/lib/api";

export const Route = createFileRoute("/billing/success")({
  component: BillingSuccess,
});

type StatusResponse = { data: SubscriptionSummary };

function BillingSuccess() {
  const { getToken, refresh } = useAuth();
  const { user: clerkUser } = useUser();
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [status, setStatus] = useState<"polling" | "active" | "timeout">("polling");
  const [simulating, setSimulating] = useState(false);
  const [simulateError, setSimulateError] = useState<string | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    let cancelled = false;
    const POLL_MS = 3000;
    const MAX_MS = 90_000;

    async function tick() {
      try {
        const result = await apiFetch<StatusResponse>("/api/subscriptions/status", {
          getToken,
        });
        if (cancelled) return;
        setSubscription(result.data);
        if (result.data.status === "active") {
          setStatus("active");
          void refresh();
          return;
        }
      } catch {
        /* swallow; retry */
      }
      if (Date.now() - startedAtRef.current >= MAX_MS) {
        setStatus("timeout");
        return;
      }
      setTimeout(tick, POLL_MS);
    }

    void tick();
    return () => {
      cancelled = true;
    };
  }, [getToken, refresh]);

  async function simulatePaid() {
    setSimulating(true);
    setSimulateError(null);
    try {
      const userId = clerkUser?.id;
      const plan = window.sessionStorage.getItem("ndl_pending_plan") || "individual_monthly";
      if (!userId) {
        setSimulateError("Not signed in.");
        return;
      }
      const orderId = `u.${userId}.${plan}.${Date.now()}`;
      const response = await fetch(`${API_BASE_URL}/api/dev/simulate-webhook`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          payment_id: `dev_${Date.now()}`,
          payment_status: "finished",
          order_id: orderId,
          price_amount: 2,
          price_currency: "usd",
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setSimulateError(body.error || `Simulation failed (${response.status}).`);
        return;
      }
      startedAtRef.current = Date.now();
      setStatus("polling");
      window.sessionStorage.removeItem("ndl_pending_plan");
    } catch (err) {
      setSimulateError(err instanceof Error ? err.message : "Simulation failed.");
    } finally {
      setSimulating(false);
    }
  }

  const isDev = import.meta.env.DEV;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        {status === "polling" && (
          <>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/85">
              Confirming payment
            </p>
            <div className="mx-auto mt-6 h-px w-56 overflow-hidden bg-border">
              <div className="billing-rail h-full bg-[linear-gradient(90deg,var(--color-primary),var(--color-accent))]" />
            </div>
            <h1 className="mt-6 font-heading text-2xl font-extrabold tracking-tight text-foreground">
              Confirming your payment.
            </h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              We're waiting for NOWPayments to confirm the transfer. This
              usually takes a couple of minutes.
            </p>
            {isDev && (
              <aside className="mt-8 border border-dashed border-amber-500/50 p-4 text-left">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-600 dark:text-amber-400">
                  Dev shortcut
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Sandbox payments don't auto-confirm. Fire a fake "finished"
                  webhook to flip your subscription to active.
                </p>
                <button
                  type="button"
                  onClick={simulatePaid}
                  disabled={simulating}
                  className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {simulating ? "Simulating…" : "Simulate paid"}
                </button>
                {simulateError && (
                  <p className="mt-2 text-xs text-destructive">{simulateError}</p>
                )}
              </aside>
            )}
          </>
        )}
        {status === "active" && (
          <>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-success">
              Active
            </p>
            <h1 className="mt-3 font-heading text-2xl font-extrabold tracking-tight text-foreground">
              You're active.
            </h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Subscription active through{" "}
              <span className="font-mono text-foreground">
                {subscription?.currentPeriodEnd
                  ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                  : "the period end"}
              </span>
              .
            </p>
            <Link
              to="/dashboard"
              className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-foreground px-5 py-3 text-sm font-bold text-background transition-opacity hover:opacity-90"
            >
              Go to dashboard
            </Link>
          </>
        )}
        {status === "timeout" && (
          <>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Still waiting
            </p>
            <h1 className="mt-3 font-heading text-2xl font-extrabold tracking-tight text-foreground">
              Still waiting.
            </h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              The webhook hasn't arrived yet. Your payment may still confirm in
              the next few minutes. Refresh this page or check the dashboard.
            </p>
            <Link
              to="/dashboard"
              className="mt-6 inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-foreground"
            >
              Open dashboard
            </Link>
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
