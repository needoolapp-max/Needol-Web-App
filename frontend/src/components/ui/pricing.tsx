import React from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { CheckCircleIcon, StarIcon } from 'lucide-react';
import { motion, type Transition } from 'framer-motion';

type FREQUENCY = 'monthly' | 'yearly';
const frequencies: FREQUENCY[] = ['monthly', 'yearly'];

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
  highlighted?: boolean;
}

interface PricingSectionProps extends React.ComponentProps<'div'> {
  plans: PricingPlan[];
  heading: string;
  description?: string;
}

export function PricingSection({ plans, heading, description, ...props }: PricingSectionProps) {
  const [frequency, setFrequency] = React.useState<FREQUENCY>('monthly');

  return (
    <div
      className={cn('flex w-full flex-col items-center justify-center space-y-8 p-4', props.className)}
      {...props}
    >
      <div className="mx-auto max-w-xl space-y-3 text-center">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl">
          {heading}
        </h2>
        {description && (
          <p className="text-muted-foreground text-sm md:text-base">{description}</p>
        )}
      </div>

      <PricingFrequencyToggle frequency={frequency} setFrequency={setFrequency} />

      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-5 md:grid-cols-3">
        {plans.map((plan) => (
          <PricingCard key={plan.name} plan={plan} frequency={frequency} />
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        All prices in USD · USDT equivalent accepted · Cancel anytime
      </p>
    </div>
  );
}

type PricingFrequencyToggleProps = React.ComponentProps<'div'> & {
  frequency: FREQUENCY;
  setFrequency: React.Dispatch<React.SetStateAction<FREQUENCY>>;
};

export function PricingFrequencyToggle({
  frequency,
  setFrequency,
  ...props
}: PricingFrequencyToggleProps) {
  return (
    <div
      className={cn(
        'bg-muted/30 mx-auto flex w-fit rounded-full border border-border p-1',
        props.className,
      )}
      {...props}
    >
      {frequencies.map((freq) => (
        <button
          key={freq}
          onClick={() => setFrequency(freq)}
          className="relative px-5 py-1.5 text-sm font-semibold capitalize"
        >
          <span className="relative z-10">{freq}</span>
          {frequency === freq && (
            <motion.span
              layoutId="frequency"
              transition={{ type: 'spring', duration: 0.4 }}
              className="bg-foreground absolute inset-0 z-0 rounded-full mix-blend-difference"
            />
          )}
        </button>
      ))}
    </div>
  );
}

type PricingCardProps = React.ComponentProps<'div'> & {
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

  return (
    <div
      className={cn(
        'relative flex w-full flex-col rounded-xl border border-border overflow-hidden transition hover:-translate-y-1',
        plan.highlighted && 'shadow-lg shadow-primary/15',
        className,
      )}
      {...props}
    >
      {plan.highlighted && (
        <BorderTrail
          className="bg-gradient-to-r from-primary via-accent to-primary"
          size={90}
        />
      )}

      {/* Header */}
      <div
        className={cn(
          'relative rounded-t-xl border-b border-border bg-muted/20 p-5',
          plan.highlighted && 'bg-primary/8',
        )}
      >
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          {plan.highlighted && (
            <span className="flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              <StarIcon className="h-3 w-3 fill-current" />
              Most popular
            </span>
          )}
          {!isFree && frequency === 'yearly' && (
            <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
              {Math.round(
                ((plan.price.monthly * 12 - plan.price.yearly) / (plan.price.monthly * 12)) * 100,
              )}% off
            </span>
          )}
        </div>

        <p className="text-base font-bold text-foreground">{plan.name}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{plan.info}</p>

        <div className="mt-3 flex items-end gap-1">
          <span className="text-4xl font-extrabold text-foreground">
            {isFree ? 'Free' : `$${plan.price[frequency]}`}
          </span>
          {!isFree && (
            <span className="mb-1 text-sm text-muted-foreground">
              /{frequency === 'monthly' ? 'mo' : 'yr'}
            </span>
          )}
        </div>
      </div>

      {/* Features */}
      <div
        className={cn(
          'flex-1 space-y-3.5 px-5 py-6 text-sm text-muted-foreground',
          plan.highlighted && 'bg-primary/4',
        )}
      >
        {plan.features.map((feature, index) => (
          <div key={index} className="flex items-start gap-2.5">
            <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      'leading-snug',
                      feature.tooltip && 'cursor-help border-b border-dashed border-muted-foreground/40',
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
          </div>
        ))}
      </div>

      {/* CTA */}
      <div
        className={cn(
          'border-t border-border p-4',
          plan.highlighted && 'bg-primary/8',
        )}
      >
        <Button
          className="w-full"
          variant={plan.highlighted ? 'default' : 'outline'}
          asChild
        >
          <Link to={plan.btn.href as never}>{plan.btn.text}</Link>
        </Button>
      </div>
    </div>
  );
}

type BorderTrailProps = {
  className?: string;
  size?: number;
  transition?: Transition;
  delay?: number;
  onAnimationComplete?: () => void;
  style?: React.CSSProperties;
};

export function BorderTrail({
  className,
  size = 60,
  transition,
  delay,
  onAnimationComplete,
  style,
}: BorderTrailProps) {
  const BASE_TRANSITION: Transition = {
    repeat: Infinity,
    duration: 5,
    ease: 'linear',
  };

  return (
    <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]">
      <motion.div
        className={cn('absolute aspect-square bg-primary', className)}
        style={{
          width: size,
          offsetPath: `rect(0 auto auto 0 round ${size}px)`,
          ...style,
        }}
        animate={{ offsetDistance: ['0%', '100%'] }}
        transition={{ ...(transition ?? BASE_TRANSITION), delay }}
        onAnimationComplete={onAnimationComplete}
      />
    </div>
  );
}
