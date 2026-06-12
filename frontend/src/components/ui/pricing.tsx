import React from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

// Phase 10-2 — Editorial Trust Ledger pricing. The previous version was a
// canonical 2023-era "fancy pricing card" pattern: BorderTrail running an
// infinite gradient around the highlighted plan, primary/8 + primary/4
// tinted backgrounds, shadow-lg shadow-primary/15 glow, a mix-blend-
// difference frequency toggle, and pill badges marking "Most popular" /
// "% off". All of it was the marquee AI-component look the redesign is
// erasing.
//
// New rate-card pattern:
//   * Plans live as columns of a single ruled table (hairline borders
//     only; vertical dividers between plans on >=md, horizontal between
//     rows). No card chrome, no shadows, no gradients.
//   * Plan name in Urbanist 800, info line in DM Sans body, price huge
//     in font-mono (numeric semantic + the meta layer's signature).
//   * Recommended plan is marked ONLY by a 2px var(--color-primary) top
//     rule on its column and a mono "RECOMMENDED" tag — no glow, no
//     scale-up, no tinted column.
//   * Frequency toggle becomes a mono segmented control with a moving
//     2px primary bottom rule (no framer-motion layoutId, no
//     mix-blend-difference).
//   * Feature rows: Check lucide icon + plain mono text. Tooltip
//     affordance is a 1px dashed underline (same as before).

type FREQUENCY = "monthly" | "yearly";
const frequencies: FREQUENCY[] = ["monthly", "yearly"];

interface PlanFeature {
  text: string;
  tooltip?: string;
}

export interface PricingPlan {
  name: string;
  info: string;
  price: { monthly: number; yearly: number };
  features: PlanFeature[];
  btn: { text: string; href: string };
  priceId?: { monthly: string; yearly: string };
  highlighted?: boolean;
}

interface PricingSectionProps extends React.ComponentProps<"div"> {
  plans: PricingPlan[];
  heading?: string;
  description?: string;
}

export function PricingSection({
  plans,
  heading,
  description,
  className,
  ...props
}: PricingSectionProps) {
  const [frequency, setFrequency] = React.useState<FREQUENCY>("monthly");

  return (
    <div className={cn("w-full", className)} {...props}>
      {(heading || description) && (
        <header className="mx-auto mb-8 max-w-2xl text-center">
          {heading && (
            <h2 className="font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              {heading}
            </h2>
          )}
          {description && (
            <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
              {description}
            </p>
          )}
        </header>
      )}

      <div className="flex justify-center">
        <PricingFrequencyToggle
          frequency={frequency}
          setFrequency={setFrequency}
        />
      </div>

      <div className="mx-auto mt-8 grid w-full max-w-5xl grid-cols-1 divide-y divide-border border-y border-border md:grid-cols-3 md:divide-x md:divide-y-0">
        {plans.map((plan) => (
          <PricingCard key={plan.name} plan={plan} frequency={frequency} />
        ))}
      </div>

      <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        All prices in USD &middot; USDT equivalent accepted &middot; Cancel anytime
      </p>
    </div>
  );
}

type PricingFrequencyToggleProps = React.ComponentProps<"div"> & {
  frequency: FREQUENCY;
  setFrequency: React.Dispatch<React.SetStateAction<FREQUENCY>>;
};

export function PricingFrequencyToggle({
  frequency,
  setFrequency,
  className,
  ...props
}: PricingFrequencyToggleProps) {
  return (
    <div
      className={cn("inline-flex border-b border-border", className)}
      role="tablist"
      aria-label="Billing frequency"
      {...props}
    >
      {frequencies.map((freq) => {
        const active = frequency === freq;
        return (
          <button
            key={freq}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setFrequency(freq)}
            className={cn(
              "relative px-6 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] transition-colors",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {freq}
            {active && (
              <span
                aria-hidden
                className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

type PricingCardProps = React.ComponentProps<"div"> & {
  plan: PricingPlan;
  frequency?: FREQUENCY;
};

export function PricingCard({
  plan,
  className,
  frequency = frequencies[0],
  ...props
}: PricingCardProps) {
  const isFree = plan.price.monthly === 0;
  const discount = !isFree
    ? Math.round(
        ((plan.price.monthly * 12 - plan.price.yearly) /
          (plan.price.monthly * 12)) *
          100,
      )
    : 0;

  return (
    <div
      className={cn(
        "relative flex w-full flex-col",
        // Recommended plan: 2px primary top rule. That's the ONLY visual
        // hint. No tint, no scale, no glow.
        plan.highlighted && "border-t-2 border-primary",
        className,
      )}
      {...props}
    >
      {/* Header */}
      <div className="space-y-3 px-6 pt-8 pb-6">
        <div className="flex items-center justify-between">
          <p className="font-heading text-base font-bold uppercase tracking-[0.12em] text-foreground">
            {plan.name}
          </p>
          {plan.highlighted && (
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
              Recommended
            </span>
          )}
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{plan.info}</p>

        <div className="flex items-baseline gap-2 pt-2">
          {isFree ? (
            <span className="font-heading text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Free
            </span>
          ) : (
            <>
              <span className="font-mono text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                ${plan.price[frequency]}
              </span>
              <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                / {frequency === "monthly" ? "Mo" : "Yr"}
              </span>
            </>
          )}
        </div>

        {!isFree && frequency === "yearly" && discount > 0 && (
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-success">
            Save {discount}% vs monthly
          </p>
        )}
      </div>

      {/* Features — flat list, hairline bullets, no card chrome. */}
      <ul className="flex flex-1 flex-col gap-3 border-t border-border px-6 py-6 text-sm text-foreground/85">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      "leading-snug",
                      feature.tooltip &&
                        "cursor-help border-b border-dashed border-muted-foreground/40",
                    )}
                  >
                    {feature.text}
                  </span>
                </TooltipTrigger>
                {feature.tooltip && (
                  <TooltipContent>
                    <p>{feature.tooltip}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="border-t border-border px-6 py-6">
        <Button
          asChild
          className={cn(
            "h-11 w-full rounded-lg font-bold transition-opacity hover:opacity-90",
            plan.highlighted
              ? "bg-foreground text-background"
              : "bg-card text-foreground border border-border hover:border-foreground",
          )}
        >
          {plan.priceId ? (
            <Link to="/billing/start" search={{ plan: plan.priceId[frequency] }}>
              {plan.btn.text}
            </Link>
          ) : (
            <Link to={plan.btn.href as never}>{plan.btn.text}</Link>
          )}
        </Button>
      </div>
    </div>
  );
}
