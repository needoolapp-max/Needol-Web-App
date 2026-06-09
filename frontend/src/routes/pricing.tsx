import { createFileRoute } from "@tanstack/react-router";
import { TopNav } from "@/components/nav/TopNav";
import { Footer } from "@/components/nav/Footer";
import { PricingSection, type PricingPlan } from "@/components/ui/pricing";
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

        <PricingSection
          plans={PLANS}
          heading="Simple, honest pricing"
          description="Pay only when you want to be found. Browse free forever — activate when you're ready to connect."
        />

        {/* Trust strip */}
        <div className="mt-14 grid gap-4 sm:grid-cols-3">
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
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="flex gap-4 rounded-xl border border-border bg-card/60 p-5"
            >
              <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{title}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
