import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const router = createRouter({
    routeTree,
    context: {},
    scrollRestoration: true,
    // Reuse preloaded route data for 30s instead of refetching on every
    // hover/intent preload (0 = always stale = redundant network churn).
    defaultPreloadStaleTime: 30_000,
  });

  return router;
};
