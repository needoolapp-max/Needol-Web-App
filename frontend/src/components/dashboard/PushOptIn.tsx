// PRD §12 push channel + §15.5 PWA — opt in / out of web push from the
// notifications dashboard.

import { useCallback, useEffect, useState } from "react";
import { BellRing, BellOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import {
  disablePushSubscription,
  ensurePushSubscription,
  getActivePushSubscription,
} from "@/lib/pwa";

type Status =
  | "loading"
  | "unsupported"
  | "no-vapid"
  | "permission-denied"
  | "off"
  | "on";

export function PushOptIn() {
  const { getToken } = useAuth();
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }
    if (!import.meta.env.VITE_VAPID_PUBLIC_KEY) {
      setStatus("no-vapid");
      return;
    }
    if (typeof Notification !== "undefined" && Notification.permission === "denied") {
      setStatus("permission-denied");
      return;
    }
    const sub = await getActivePushSubscription();
    setStatus(sub ? "on" : "off");
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function turnOn() {
    setBusy(true);
    setError(null);
    try {
      const result = await ensurePushSubscription();
      if (!result.ok) {
        setError(reasonLabel(result.reason));
        await refresh();
        return;
      }
      await apiFetch("/api/notifications/push/subscribe", {
        method: "POST",
        getToken,
        body: JSON.stringify(result.subscription.toJSON()),
      });
      setStatus("on");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to enable push.");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    setError(null);
    try {
      const out = await disablePushSubscription();
      if (out.endpoint) {
        await apiFetch("/api/notifications/push/subscribe", {
          method: "DELETE",
          getToken,
          body: JSON.stringify({ endpoint: out.endpoint }),
        });
      }
      setStatus("off");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to disable push.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") {
    return (
      <div data-test="push-optin" className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
        Checking push status…
      </div>
    );
  }
  if (status === "unsupported") {
    return (
      <div data-test="push-optin" className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
        Web push isn't supported on this browser.
      </div>
    );
  }
  if (status === "no-vapid") {
    return (
      <div data-test="push-optin" className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
        Web push isn't configured for this environment.
      </div>
    );
  }
  if (status === "permission-denied") {
    return (
      <div data-test="push-optin" className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
        Notifications are blocked. Update browser permissions to re-enable.
      </div>
    );
  }
  return (
    <div data-test="push-optin" className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Web push</p>
          <p className="text-xs text-muted-foreground">
            {status === "on"
              ? "You'll receive push notifications on this device."
              : "Get push notifications on this device (PRD §12)."}
          </p>
          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
        {status === "on" ? (
          <button
            disabled={busy}
            onClick={turnOff}
            data-test="push-optin-disable"
            className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50"
          >
            <BellOff className="h-3.5 w-3.5" /> Disable
          </button>
        ) : (
          <button
            disabled={busy}
            onClick={turnOn}
            data-test="push-optin-enable"
            className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <BellRing className="h-3.5 w-3.5" /> Enable
          </button>
        )}
      </div>
    </div>
  );
}

function reasonLabel(reason: string): string {
  if (reason === "permission-denied") return "Permission denied. Update browser settings to re-enable.";
  if (reason === "no-vapid") return "Push not configured for this environment.";
  if (reason === "no-sw") return "Service worker not ready yet. Reload and try again.";
  if (reason === "unsupported") return "This browser doesn't support web push.";
  return "Could not enable push.";
}
