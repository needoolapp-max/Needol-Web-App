// PRD §12 — per-user notification preferences. Renders toggleable rows for
// each opt-outable event. Mandatory events (subscription_expired, etc.) are
// displayed with a "Required" pill and a disabled switch.

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Bell, BellOff, Settings2, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

type PrefRow = { event_type: string; enabled: boolean; updated_at?: string };
type PrefsResponse = { data: { preferences: PrefRow[]; mandatory: string[] } };

// Display catalog — the PRD §12 event table mapped to friendly labels +
// channel summary. Order roughly matches PRD §12.
const EVENT_CATALOG: Array<{ key: string; label: string; channels: string; group: string }> = [
  { group: "Account", key: "subscription_activated", label: "Subscription activated", channels: "In-app + Email" },
  { group: "Account", key: "subscription_expiring", label: "Subscription expiring soon", channels: "In-app + Email" },
  { group: "Account", key: "subscription_expired", label: "Subscription expired", channels: "In-app + Email" },
  { group: "Account", key: "renewal_window_open", label: "Renewal window open", channels: "In-app + Email" },
  { group: "Wallet", key: "referral_commission_earned", label: "Referral commission earned", channels: "In-app + Email" },
  { group: "Wallet", key: "withdrawal_requested", label: "Withdrawal requested", channels: "In-app + Email" },
  { group: "Wallet", key: "withdrawal_approved", label: "Withdrawal approved", channels: "In-app + Email" },
  { group: "Wallet", key: "withdrawal_completed", label: "Withdrawal completed", channels: "In-app + Email" },
  { group: "Wallet", key: "withdrawal_failed", label: "Withdrawal failed", channels: "In-app + Email" },
  { group: "Posts", key: "post_approved", label: "Post approved", channels: "In-app + Email" },
  { group: "Posts", key: "post_rejected", label: "Post rejected", channels: "In-app + Email" },
  { group: "Posts", key: "comment_received", label: "Comment received", channels: "In-app + Email" },
  { group: "Posts", key: "reply_received", label: "Reply to your comment", channels: "In-app" },
  { group: "Posts", key: "like_received", label: "Like received", channels: "In-app" },
  { group: "Profile", key: "new_follower", label: "New follower", channels: "In-app" },
  { group: "Profile", key: "contact_viewed", label: "Someone viewed your contact", channels: "In-app" },
  { group: "Profile", key: "notify_active_interest", label: "Interest registered (Notify when active)", channels: "In-app + Email" },
  { group: "Profile", key: "notify_active_target_activated", label: "Watched member now Active", channels: "In-app + Email" },
  { group: "Hire", key: "hire_quote_paid", label: "Hire request quote paid", channels: "In-app + Email" },
  { group: "Hire", key: "application_status_change", label: "Application status change", channels: "In-app + Email" },
  { group: "Hire", key: "hired", label: "Marked Hired", channels: "In-app + Email" },
  { group: "Hire", key: "review_received", label: "Review received", channels: "In-app + Email" },
  { group: "Hire", key: "review_held", label: "Low-rated review held for review", channels: "In-app" },
];

export function NotificationPrefsPanel() {
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [mandatory, setMandatory] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError(null);
    try {
      const r = await apiFetch<PrefsResponse>("/api/notifications/preferences", { getToken });
      const map: Record<string, boolean> = {};
      for (const row of r.data.preferences || []) {
        map[row.event_type] = row.enabled;
      }
      setPrefs(map);
      setMandatory(new Set(r.data.mandatory || []));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load preferences.");
    } finally {
      setLoading(false);
    }
  }, [open, getToken]);

  useEffect(() => { void reload(); }, [reload]);

  async function toggle(eventType: string, nextEnabled: boolean) {
    setBusy(eventType);
    setError(null);
    try {
      await apiFetch(`/api/notifications/preferences`, {
        method: "PATCH",
        getToken,
        body: JSON.stringify({ event_type: eventType, enabled: nextEnabled }),
      });
      setPrefs((prev) => ({ ...prev, [eventType]: nextEnabled }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update preference.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div data-test="notification-prefs">
      <button
        type="button"
        data-test="notification-prefs-open"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
      >
        <Settings2 className="h-3.5 w-3.5" />
        {open ? "Hide preferences" : "Notification preferences"}
      </button>

      {open && (
        <section
          data-test="notification-prefs-panel"
          className="mt-3 rounded-2xl border border-border bg-card p-4"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Notification preferences</h3>
              <p className="text-xs text-muted-foreground">
                Defaults are subscribed. Mandatory events (marked Required) always send.
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1 hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>

          {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {error && <p className="text-xs text-destructive">{error}</p>}

          {!loading && (
            <div className="grid gap-4">
              {Object.entries(groupByCategory(EVENT_CATALOG)).map(([group, entries]) => (
                <div key={group}>
                  <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {group}
                  </h4>
                  <ul className="divide-y divide-border rounded-xl border border-border">
                    {entries.map((row) => {
                      const required = mandatory.has(row.key);
                      const enabled = required ? true : (prefs[row.key] ?? true);
                      return (
                        <li
                          key={row.key}
                          data-test={`pref-row-${row.key}`}
                          className="flex items-center justify-between gap-3 px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{row.label}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {row.channels}
                              {required && " · Required (cannot be disabled)"}
                            </p>
                          </div>
                          <button
                            type="button"
                            data-test={`pref-toggle-${row.key}`}
                            disabled={required || busy === row.key}
                            onClick={() => toggle(row.key, !enabled)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                              enabled
                                ? "bg-success/15 text-success"
                                : "bg-muted text-muted-foreground"
                            } disabled:opacity-60`}
                          >
                            {enabled ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
                            {enabled ? "On" : "Off"}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function groupByCategory<T extends { group: string }>(rows: T[]): Record<string, T[]> {
  return rows.reduce<Record<string, T[]>>((acc, row) => {
    if (!acc[row.group]) acc[row.group] = [];
    acc[row.group].push(row);
    return acc;
  }, {});
}
