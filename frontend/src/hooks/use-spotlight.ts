import { useEffect, useRef } from "react";

export function useSpotlightRef<T extends HTMLElement = HTMLElement>(enabled = true) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      if (document.documentElement.classList.contains("needool-safe-onboarding")) return;
      el.style.setProperty("--x", e.clientX.toFixed(2));
      el.style.setProperty("--xp", (e.clientX / window.innerWidth).toFixed(2));
      el.style.setProperty("--y", e.clientY.toFixed(2));
      el.style.setProperty("--yp", (e.clientY / window.innerHeight).toFixed(2));
    };
    document.addEventListener("pointermove", onMove);
    return () => document.removeEventListener("pointermove", onMove);
  }, [enabled]);

  return ref;
}
