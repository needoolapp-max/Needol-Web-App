import { createFileRoute } from "@tanstack/react-router";
import { TopNav } from "@/components/nav/TopNav";
import { Footer } from "@/components/nav/Footer";
import { GlowCard } from "@/components/ui/spotlight-card";
import { billingPlans } from "@/lib/mvpData";
import { CalendarClock, CreditCard, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({ meta: [{ title: "Subscriptions - Needool" }] }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">Dummy billing engine</p>
        <h1 className="mt-2 text-3xl font-extrabold text-foreground sm:text-4xl">Subscriptions and activation</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
          This page uses static text for NowPayments, USDT, card on-ramp, renewal windows, referral trial days, and the 13-month forward cap.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {billingPlans.map((plan) => (
            <GlowCard key={plan.name} customSize className="flex flex-col rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Monthly</p>
                  <p className="mt-1 font-bold text-foreground">{plan.monthly}</p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Yearly</p>
                  <p className="mt-1 font-bold text-foreground">{plan.yearly}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{plan.limits}</p>
              <button className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                <CreditCard className="h-4 w-4" /> Dummy checkout
              </button>
            </GlowCard>
          ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ["7 free days", "Referred signups get 7 active days. Paid time stacks after the trial end."],
            ["Renewal windows", "Yearly renewals open with 30 days left. Monthly renewals open with 10 days left."],
            ["13-month cap", "Purchases that push expiry beyond 13 months from today are blocked server-side."],
          ].map(([title, body], index) => (
            <GlowCard key={title} customSize className="flex flex-col rounded-2xl p-5">
              {index === 2 ? <ShieldAlert className="h-5 w-5 text-primary" /> : <CalendarClock className="h-5 w-5 text-primary" />}
              <h3 className="mt-3 font-bold text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
            </GlowCard>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
