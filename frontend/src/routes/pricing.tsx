import { createFileRoute } from "@tanstack/react-router";
import { TopNav } from "@/components/nav/TopNav";
import { Footer } from "@/components/nav/Footer";
import { PricingSection, type PricingPlan } from "@/components/ui/pricing";
import { EditorialHeader } from "@/components/common/EditorialHeader";
import { Zap, ShieldCheck, Info } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({ meta: [{ title: "Pricing - Needool" }] }),
  component: PricingPage,
});

const PLANS: PricingPlan[] = [
  {
    name: "Free",
    info: "Browse the directory",
    price: { monthly: 0, yearly: 0 },
    features: [
      { text: "Browse all provider profiles" },
      { text: "Search by skill, city, or country" },
      { text: "View public skills & info" },
      { text: "Contact details hidden", tooltip: "Contact details unlock when you activate your account" },
      { text: "No Need Requests or posting", tooltip: "Posting access requires an active subscription" },
      { text: "No job applications", tooltip: "Apply to jobs and opportunities as an active member" },
    ],
    btn: { text: "Browse as visitor", href: "/search" },
  },
  {
    name: "Individual",
    info: "For professionals & freelancers",
    price: { monthly: 5, yearly: 30 },
    priceId: { monthly: "individual_monthly", yearly: "individual_yearly" },
    highlighted: true,
    features: [
      { text: "Full public profile + verified badge", tooltip: "Your profile ranks higher when active" },
      { text: "30 skills · 7 public links" },
      { text: "Contact reveal for clients" },
      { text: "4 Need Requests / month", tooltip: "Post your service needs and receive provider responses" },
      { text: "2 Opportunities / month", tooltip: "Publish grants, fellowships, and partnership calls" },
      { text: "Job applications + CV visibility" },
      { text: "Referral rewards (10% active)", tooltip: "Earn 10% when a referred member stays active, 2% while inactive" },
    ],
    btn: { text: "Activate my account", href: "/signup" },
  },
  {
    name: "Business",
    info: "For teams & organizations",
    price: { monthly: 10, yearly: 60 },
    priceId: { monthly: "business_monthly", yearly: "business_yearly" },
    features: [
      { text: "Organization + branch profiles", tooltip: "Set up an HQ profile and link branch locations" },
      { text: "100 skills · 15 public links" },
      { text: "Lead routing to team inboxes", tooltip: "Route contact reveals and hire intent to the right team member" },
      { text: "8 Need Requests / month" },
      { text: "4 Opportunities / month" },
      { text: "Business analytics dashboard", tooltip: "Profile views, lead conversion, referral signups, and top services" },
      { text: "Priority listing in search results", tooltip: "Active business profiles rank above inactive accounts in all searches" },
    ],
    btn: { text: "Start business profile", href: "/signup" },
  },
];

function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-6xl px-4 py-14">
        <EditorialHeader
          number="01"
          kicker="Pricing"
          title="Simple, honest pricing."
          sub="Pay only when you want to be found. Browse free forever — activate when you're ready to connect."
        />

        <div className="mt-10">
          <PricingSection plans={PLANS} heading="" description="" />
        </div>

        {/* Trust strip — ruled, no boxed icon wells. */}
        <section className="mt-20">
          <EditorialHeader
            number="02"
            kicker="Operating policy"
            title="Three guarantees."
          />
          <ul className="mt-8 divide-y divide-border border-y border-border">
            {[
              {
                icon: Zap,
                title: "Activate instantly",
                body: "Your profile goes live the moment your payment confirms. No waiting, no approval queue.",
              },
              {
                icon: ShieldCheck,
                title: "Stacks with referrals",
                body: "Referred signups get 7 free active days. Paid time stacks on top — and expiry never exceeds 13 months.",
              },
              {
                icon: Info,
                title: "USDT accepted",
                body: "Pay with card or USDT via NowPayments. Both USD and USDT amounts are equivalent — no conversion surprises.",
              },
            ].map(({ icon: Icon, title, body }, i) => (
              <li
                key={title}
                className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 py-7 sm:grid-cols-[5rem_1fr] sm:gap-x-10 sm:py-8"
              >
                <span className="font-mono text-sm font-semibold tracking-[0.16em] text-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="col-start-2 max-w-2xl">
                  <h3 className="flex items-center gap-2 font-heading text-base font-bold text-foreground sm:text-lg">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  );
}
