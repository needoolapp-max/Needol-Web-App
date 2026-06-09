import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock3,
  Copy,
  History,
  Loader2,
  Send,
  Users,
  WalletCards,
} from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type WalletTotals = {
  totalEarned: number;
  totalWithdrawn: number;
  reserved: number;
  availableBalance: number;
};

type ReferredUser = {
  userId: string;
  username: string;
  name: string;
  email?: string;
  status: string;
  joinedAt?: string;
};

type Commission = {
  id: string;
  amount_usdt: number | string;
  rate: number | string;
  status: string;
  created_at?: string;
  provider_payment_id?: string;
  referrer_status_at_payout?: string;
};

type Withdrawal = {
  id: string;
  amount_usdt: number | string;
  trc20_address: string;
  status: string;
  tx_hash?: string | null;
  reject_reason?: string | null;
  failure_reason?: string | null;
  created_at?: string;
  completed_at?: string | null;
};

type ReferralSummary = {
  referralCode: string;
  referralLink: string;
  totals: WalletTotals;
  referredUsers: ReferredUser[];
  commissions: Commission[];
};

const emptyTotals: WalletTotals = {
  totalEarned: 0,
  totalWithdrawn: 0,
  reserved: 0,
  availableBalance: 0,
};

export const Route = createFileRoute("/dashboard/referrals")({
  head: () => ({ meta: [{ title: "Referrals - Needool Dashboard" }] }),
  component: ReferralsWalletPage,
});

function ReferralsWalletPage() {
  const { user, getToken, refresh } = useAuth();
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [totp, setTotp] = useState("");

  const loadWallet = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [summaryRes, withdrawalsRes] = await Promise.all([
        apiFetch<{ data: ReferralSummary }>("/api/referrals/summary", { getToken }),
        apiFetch<{ data: Withdrawal[] }>("/api/withdrawals", { getToken }),
      ]);
      setSummary(summaryRes.data);
      setWithdrawals(withdrawalsRes.data ?? []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  const totals = summary?.totals ?? emptyTotals;
  const referralCode = summary?.referralCode || user?.referralCode || "N/A";
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const referralLink = summary?.referralLink || `${origin}/signup?ref=${user?.username ?? ""}`;

  const sortedWithdrawals = useMemo(
    () => [...withdrawals].sort((a, b) => dateMs(b.created_at) - dateMs(a.created_at)),
    [withdrawals],
  );

  async function copy(value: string) {
    await navigator.clipboard?.writeText(value);
    setMessage("Copied.");
    window.setTimeout(() => setMessage(""), 1600);
  }

  async function submitWithdrawal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await apiFetch<{ data: Withdrawal }>("/api/withdrawals", {
        method: "POST",
        getToken,
        body: JSON.stringify({
          amountUsdt: amount,
          trc20Address: address,
          totpCode: totp,
        }),
      });
      setMessage("Withdrawal request submitted.");
      setAmount("");
      setAddress("");
      setTotp("");
      await Promise.all([loadWallet(), refresh()]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-10">
      <div className="mb-6 flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex rounded-lg bg-primary/10 p-2 text-primary">
            <WalletCards className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold text-foreground sm:text-3xl">
            Referrals wallet
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Track referral signups, earned commissions, wallet balance, and manual USDT withdrawals.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => copy(referralCode)}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
          >
            <Copy className="h-4 w-4" /> Code
          </button>
          <button
            type="button"
            onClick={() => copy(referralLink)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Copy className="h-4 w-4" /> Link
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 rounded-lg border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
          {message}
        </div>
      )}

      <section className="grid gap-3 md:grid-cols-4">
        <MetricCard label="Total earned" value={formatUsdt(totals.totalEarned)} />
        <MetricCard label="Total withdrawn" value={formatUsdt(totals.totalWithdrawn)} />
        <MetricCard label="Reserved" value={formatUsdt(totals.reserved)} />
        <MetricCard label="Available" value={formatUsdt(totals.availableBalance)} strong />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-6">
          <Panel title="Referral code" icon={<Users className="h-4 w-4" />}>
            <div className="grid gap-3 md:grid-cols-[260px_1fr]">
              <div className="rounded-lg bg-secondary p-4">
                <div className="text-xs font-bold uppercase text-muted-foreground">Code</div>
                <div className="mt-2 break-all font-mono text-xl font-bold text-foreground">
                  {referralCode}
                </div>
              </div>
              <div className="rounded-lg bg-secondary p-4">
                <div className="text-xs font-bold uppercase text-muted-foreground">Signup link</div>
                <div className="mt-2 break-all font-mono text-sm text-foreground">{referralLink}</div>
              </div>
            </div>
          </Panel>

          <Panel title="Referred users" icon={<Users className="h-4 w-4" />}>
            {loading ? (
              <LoadingRow />
            ) : summary?.referredUsers.length ? (
              <div className="grid gap-2">
                {summary.referredUsers.map((referral) => (
                  <div
                    key={referral.userId}
                    className="grid gap-2 rounded-lg bg-secondary p-3 text-sm md:grid-cols-[1fr_160px_120px]"
                  >
                    <div>
                      <div className="font-semibold text-foreground">{referral.name}</div>
                      <div className="text-xs text-muted-foreground">
                        @{referral.username}
                        {referral.email ? ` - ${referral.email}` : ""}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDate(referral.joinedAt)}</div>
                    <StatusPill status={referral.status} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyLine text="No referred users yet." />
            )}
          </Panel>

          <Panel title="Commission history" icon={<History className="h-4 w-4" />}>
            {loading ? (
              <LoadingRow />
            ) : summary?.commissions.length ? (
              <div className="grid gap-2">
                {summary.commissions.map((commission) => (
                  <div
                    key={commission.id}
                    className="grid gap-2 rounded-lg bg-secondary p-3 text-sm md:grid-cols-[1fr_120px_120px]"
                  >
                    <div>
                      <div className="font-semibold text-foreground">
                        {formatUsdt(commission.amount_usdt)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Rate {formatRate(commission.rate)} - {commission.referrer_status_at_payout || "status captured"}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDate(commission.created_at)}</div>
                    <StatusPill status={commission.status} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyLine text="No commissions yet." />
            )}
          </Panel>

          <Panel title="Withdrawal history" icon={<Clock3 className="h-4 w-4" />}>
            {loading ? (
              <LoadingRow />
            ) : sortedWithdrawals.length ? (
              <div className="grid gap-2">
                {sortedWithdrawals.map((withdrawal) => (
                  <div
                    key={withdrawal.id}
                    className="grid gap-2 rounded-lg bg-secondary p-3 text-sm lg:grid-cols-[160px_1fr_120px]"
                  >
                    <div>
                      <div className="font-semibold text-foreground">
                        {formatUsdt(withdrawal.amount_usdt)}
                      </div>
                      <div className="text-xs text-muted-foreground">{formatDate(withdrawal.created_at)}</div>
                    </div>
                    <div className="min-w-0 break-all font-mono text-xs text-muted-foreground">
                      {withdrawal.tx_hash || withdrawal.trc20_address}
                      {withdrawal.reject_reason ? ` - ${withdrawal.reject_reason}` : ""}
                      {withdrawal.failure_reason ? ` - ${withdrawal.failure_reason}` : ""}
                    </div>
                    <StatusPill status={withdrawal.status} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyLine text="No withdrawal requests yet." />
            )}
          </Panel>
        </div>

        <Panel title="Request withdrawal" icon={<Send className="h-4 w-4" />}>
          <form className="grid gap-4" onSubmit={submitWithdrawal}>
            <label className="grid gap-1.5 text-sm font-semibold text-foreground">
              Amount
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                placeholder="20.00"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-foreground">
              TRC20 address
              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="T..."
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-foreground">
              TOTP code
              <input
                value={totp}
                onChange={(event) => setTotp(event.target.value)}
                inputMode="numeric"
                maxLength={6}
                placeholder="424242"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
            <div className="rounded-lg bg-secondary p-3 text-xs leading-5 text-muted-foreground">
              Minimum withdrawal is 20 USDT. Local development accepts code 424242 until Clerk/Supabase TOTP is wired.
            </div>
            <button
              type="submit"
              disabled={submitting || loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit request
            </button>
          </form>
        </Panel>
      </section>
    </main>
  );
}

function MetricCard({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs font-bold uppercase text-muted-foreground">{label}</div>
      <div className={`mt-2 font-mono text-xl font-bold ${strong ? "text-primary" : "text-foreground"}`}>
        {value}
      </div>
    </article>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {title}
      </div>
      {children}
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const normalized = status || "pending";
  const cls =
    normalized === "completed" || normalized === "earned" || normalized === "active"
      ? "bg-success/15 text-success"
      : normalized === "rejected" || normalized === "failed" || normalized === "reversed"
        ? "bg-destructive/15 text-destructive"
        : "bg-primary/15 text-primary";
  return (
    <span className={`inline-flex h-7 items-center justify-center rounded-lg px-2 text-xs font-bold capitalize ${cls}`}>
      {normalized.replace("-", " ")}
    </span>
  );
}

function LoadingRow() {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-secondary p-3 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading...
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="rounded-lg bg-secondary p-3 text-sm text-muted-foreground">{text}</p>;
}

function formatUsdt(value: number | string | undefined) {
  return `${Number(value || 0).toFixed(2)} USDT`;
}

function formatRate(value: number | string | undefined) {
  return `${(Number(value || 0) * 100).toFixed(0)}%`;
}

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function dateMs(value?: string | null) {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return "Request failed.";
}
