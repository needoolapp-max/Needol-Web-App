import { createFileRoute } from "@tanstack/react-router";
import { TopNav } from "@/components/nav/TopNav";
import { Footer } from "@/components/nav/Footer";
import { referralRows } from "@/lib/mvpData";
import { Copy, WalletCards } from "lucide-react";

export const Route = createFileRoute("/referrals")({
  head: () => ({ meta: [{ title: "Referrals - Needool" }] }),
  component: ReferralsPage,
});

function ReferralsPage() {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">Dummy wallet</p>
        <h1 className="mt-2 text-3xl font-extrabold text-foreground sm:text-4xl">Referrals and withdrawals</h1>
        <div className="mt-8 grid gap-4 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-2xl border border-border bg-card p-5">
            <WalletCards className="h-6 w-6 text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Current balance</p>
            <p className="text-3xl font-extrabold text-foreground">51.60 USDT</p>
            <button className="mt-5 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">
              <Copy className="h-4 w-4" /> needool.com/?ref=demo.user
            </button>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">Withdrawals are dummy-only here. Production requires TRC20 address, TOTP, minimum 20 USDT, and manual admin payout.</p>
          </aside>
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-bold text-foreground">Referred users</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="border-b border-border py-3">Username</th>
                    <th className="border-b border-border py-3">Status</th>
                    <th className="border-b border-border py-3">Rate</th>
                    <th className="border-b border-border py-3">Earned</th>
                  </tr>
                </thead>
                <tbody>
                  {referralRows.map((row) => (
                    <tr key={row.user}>
                      <td className="border-b border-border py-3 font-medium text-foreground">{row.user}</td>
                      <td className="border-b border-border py-3">{row.status}</td>
                      <td className="border-b border-border py-3">{row.rate}</td>
                      <td className="border-b border-border py-3">{row.earned}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
