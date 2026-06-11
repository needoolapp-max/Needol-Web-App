import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import "./styles.css";

const router = getRouter();
const root = document.getElementById("root");

if (!root) {
  throw new Error("Needool root element was not found.");
}

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

// Phase 10-2 — remove the inline boot preloader (#boot) once the router
// resolves the first route. Three signals are wired with overlapping
// guarantees so the boot screen is never stuck:
//   1. router.subscribe("onResolved") — the accurate signal; fires the
//      moment a matched route's loader + render completes.
//   2. window load — fallback if the router event API ever changes.
//   3. 10s hard timeout — last-resort safety so a bug here can never
//      leave the user staring at the preloader.
function removeBoot() {
  const boot = document.getElementById("boot");
  if (!boot || boot.classList.contains("boot--done")) return;
  boot.classList.add("boot--done");
  const drop = () => boot.remove();
  boot.addEventListener("transitionend", drop, { once: true });
  // Belt-and-braces: also remove after the 220ms fade plus a small margin.
  window.setTimeout(drop, 500);
}

let unsubscribeResolved: (() => void) | undefined;
try {
  unsubscribeResolved = router.subscribe("onResolved", () => {
    removeBoot();
    unsubscribeResolved?.();
  });
} catch {
  // Router subscribe API mismatch — leave to the fallback signals below.
}

window.addEventListener("load", removeBoot, { once: true });
window.setTimeout(removeBoot, 10_000);
