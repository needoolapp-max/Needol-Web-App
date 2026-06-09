// PRD §15.5 — A2HS install banner. Renders nothing when the browser hasn't
// fired `beforeinstallprompt` (already installed, unsupported, or session
// dismissed).

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { isA2HSAvailable, promptA2HS, subscribeA2HSAvailability } from "@/lib/pwa";

const SESSION_DISMISSED_KEY = "ndl_a2hs_dismissed";

export function InstallPrompt() {
  const [available, setAvailable] = useState(isA2HSAvailable());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = sessionStorage.getItem(SESSION_DISMISSED_KEY);
    if (stored === "1") setDismissed(true);
    const unsub = subscribeA2HSAvailability(setAvailable);
    return unsub;
  }, []);

  if (!available || dismissed) return null;

  return (
    <div
      data-test="a2hs-prompt"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-border bg-card p-4 shadow-lg"
    >
      <div className="flex items-start gap-3">
        <Download className="mt-0.5 h-5 w-5 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Install Needool</p>
          <p className="text-xs text-muted-foreground">
            Add to your home screen for faster access + offline support.
          </p>
        </div>
        <button
          aria-label="Dismiss"
          onClick={() => {
            sessionStorage.setItem(SESSION_DISMISSED_KEY, "1");
            setDismissed(true);
          }}
          className="rounded-lg p-1 hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          onClick={() => {
            sessionStorage.setItem(SESSION_DISMISSED_KEY, "1");
            setDismissed(true);
          }}
          className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
          data-test="a2hs-later"
        >
          Later
        </button>
        <button
          onClick={() => { void promptA2HS(); }}
          data-test="a2hs-install"
          className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Download className="h-3.5 w-3.5" /> Install
        </button>
      </div>
    </div>
  );
}
