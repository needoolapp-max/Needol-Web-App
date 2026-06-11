import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";

/**
 * Phase 10-2 — Subsequent-navigation progress rail. Mounted in __root.tsx
 * so it shows on every route transition. Uses the same primary→accent
 * gradient as the inline boot preloader's rail and the TopNav shimmer rail
 * (continuity of the "live network" accent across the whole experience).
 *
 * Behavior:
 *   - status idle → not in DOM (no layout, no paint).
 *   - onBeforeLoad → mount + animate 0% → 80% over ~2s (perceived progress).
 *   - onResolved → snap to 100%, fade out, unmount.
 *   - prefers-reduced-motion → static 80% bar with opacity transitions only.
 */
type Status = "idle" | "loading" | "done";

export function RouteProgress() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    const unsubBefore = router.subscribe("onBeforeLoad", () => {
      setStatus("loading");
    });
    const unsubResolved = router.subscribe("onResolved", () => {
      setStatus("done");
      // Hold the 100% snap visible briefly, then return to idle (unmount).
      window.setTimeout(() => setStatus("idle"), 280);
    });
    return () => {
      unsubBefore();
      unsubResolved();
    };
  }, [router]);

  if (status === "idle") return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px]"
      data-status={status}
    >
      <div
        className="h-full origin-left bg-[linear-gradient(90deg,var(--color-primary),var(--color-accent))] transition-[transform,opacity] motion-reduce:transition-opacity"
        style={{
          transform:
            status === "loading" ? "scaleX(0.78)" : "scaleX(1)",
          opacity: status === "done" ? 0 : 1,
          transitionDuration:
            status === "loading" ? "2000ms" : "260ms",
          transitionTimingFunction:
            status === "loading"
              ? "cubic-bezier(0.2, 0.7, 0.3, 1)"
              : "ease-out",
        }}
      />
    </div>
  );
}
