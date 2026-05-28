import React, { ReactNode } from 'react';
import { useSpotlightRef } from '@/hooks/use-spotlight';

interface GlowCardProps {
  children?: ReactNode;
  className?: string;
  glowColor?: 'blue' | 'purple' | 'green' | 'red' | 'orange';
  size?: 'sm' | 'md' | 'lg';
  width?: string | number;
  height?: string | number;
  customSize?: boolean;
}

const glowColorMap = {
  blue:   { base: 220, spread: 200 },
  purple: { base: 280, spread: 300 },
  green:  { base: 120, spread: 200 },
  red:    { base: 0,   spread: 200 },
  orange: { base: 30,  spread: 200 },
};

const sizeMap = {
  sm: 'w-48 h-64',
  md: 'w-64 h-80',
  lg: 'w-80 h-96',
};

const GlowCard: React.FC<GlowCardProps> = ({
  children,
  className = '',
  glowColor = 'blue',
  size = 'md',
  width,
  height,
  customSize = false,
}) => {
  const ref = useSpotlightRef<HTMLDivElement>();
  const { base, spread } = glowColorMap[glowColor];

  const inlineStyles: React.CSSProperties & Record<string, string | number> = {
    '--base': base,
    '--spread': spread,
    '--sc-base': base,
    '--sc-spread': spread,
    '--border': '3',
    '--backdrop': 'var(--glow-card-backdrop, hsl(0 0% 60% / 0.12))',
    '--backup-border': 'var(--glow-card-border, var(--backdrop))',
    '--size': '200',
    '--outer': '1',
    '--border-size': 'calc(var(--border, 2) * 1px)',
    '--spotlight-size': 'calc(var(--size, 150) * 1px)',
    '--hue': 'calc(var(--base) + (var(--xp, 0) * var(--spread, 0)))',
    backgroundImage: `radial-gradient(
      var(--spotlight-size) var(--spotlight-size) at
      calc(var(--x, 0) * 1px)
      calc(var(--y, 0) * 1px),
      hsl(var(--hue, 210) calc(var(--saturation, 100) * 1%) calc(var(--lightness, 70) * 1%) / var(--bg-spot-opacity, 0.12)), transparent
    )`,
    backgroundColor: 'var(--backdrop, transparent)',
    backgroundSize: 'calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)))',
    backgroundPosition: '50% 50%',
    backgroundAttachment: 'fixed',
    border: 'var(--border-size) solid var(--backup-border)',
    position: 'relative',
    overflow: 'hidden',
    touchAction: 'none',
  };

  if (width !== undefined)  inlineStyles.width  = typeof width  === 'number' ? `${width}px`  : width;
  if (height !== undefined) inlineStyles.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      ref={ref}
      style={inlineStyles}
      className={[
        'spotlight-card',
        customSize
          ? 'rounded-2xl relative lg:backdrop-blur-[5px]'
          : [sizeMap[size], 'aspect-3/4', 'rounded-2xl relative grid grid-rows-[1fr_auto] shadow-[0_1rem_2rem_-1rem_black] p-4 gap-4 lg:backdrop-blur-[5px]'].join(' '),
        className,
      ].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
};

export { GlowCard };
