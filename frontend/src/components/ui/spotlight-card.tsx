import React, { ReactNode, useEffect, useState } from "react";
import { useSpotlightRef } from "@/hooks/use-spotlight";

interface GlowCardProps {
  children?: ReactNode;
  className?: string;
  glowColor?: "blue" | "purple" | "green" | "red" | "orange";
  size?: "sm" | "md" | "lg";
  width?: string | number;
  height?: string | number;
  customSize?: boolean;
}

const glowColorMap = {
  blue: { base: 220, spread: 200 },
  purple: { base: 280, spread: 300 },
  green: { base: 120, spread: 200 },
  red: { base: 0, spread: 200 },
  orange: { base: 30, spread: 200 },
};

const sizeMap = {
  sm: "w-48 h-64",
  md: "w-64 h-80",
  lg: "w-80 h-96",
};

function useDesktopEffects() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const sync = () => setEnabled(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return enabled;
}

const GlowCard: React.FC<GlowCardProps> = ({
  children,
  className = "",
  glowColor = "blue",
  size = "md",
  width,
  height,
  customSize = false,
}) => {
  const effectsEnabled = useDesktopEffects();
  const ref = useSpotlightRef<HTMLDivElement>(effectsEnabled);
  const { base, spread } = glowColorMap[glowColor];

  const inlineStyles: React.CSSProperties & Record<string, string | number> = effectsEnabled
    ? {
        "--base": base,
        "--spread": spread,
        "--sc-base": base,
        "--sc-spread": spread,
        "--border": "3",
        "--backdrop": "var(--glow-card-backdrop, hsl(0 0% 60% / 0.12))",
        "--backup-border": "var(--glow-card-border, var(--backdrop))",
        "--size": "200",
        "--outer": "1",
        "--border-size": "calc(var(--border, 2) * 1px)",
        "--spotlight-size": "calc(var(--size, 150) * 1px)",
        "--hue": "calc(var(--base) + (var(--xp, 0) * var(--spread, 0)))",
        backgroundImage: `radial-gradient(
      var(--spotlight-size) var(--spotlight-size) at
      calc(var(--x, 0) * 1px)
      calc(var(--y, 0) * 1px),
      hsl(var(--hue, 210) calc(var(--saturation, 100) * 1%) calc(var(--lightness, 70) * 1%) / var(--bg-spot-opacity, 0.12)), transparent
    )`,
        backgroundColor: "var(--backdrop, transparent)",
        backgroundSize:
          "calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)))",
        backgroundPosition: "50% 50%",
        backgroundAttachment: "fixed",
        border: "var(--border-size) solid var(--backup-border)",
        position: "relative",
        overflow: "hidden",
        touchAction: "none",
      }
    : {
        position: "relative",
        overflow: "hidden",
      };

  if (width !== undefined) inlineStyles.width = typeof width === "number" ? `${width}px` : width;
  if (height !== undefined)
    inlineStyles.height = typeof height === "number" ? `${height}px` : height;

  const sizingClass = customSize
    ? "rounded-2xl relative"
    : [
        sizeMap[size],
        "aspect-3/4",
        "rounded-2xl relative grid grid-rows-[1fr_auto] p-4 gap-4",
      ].join(" ");

  return (
    <div
      ref={ref}
      style={inlineStyles}
      className={[
        effectsEnabled
          ? "spotlight-card lg:backdrop-blur-[5px] shadow-[0_1rem_2rem_-1rem_black]"
          : "border border-border bg-card shadow-sm",
        sizingClass,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
};

export { GlowCard };
