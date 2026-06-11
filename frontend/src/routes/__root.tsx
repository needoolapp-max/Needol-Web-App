import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";
import { ClerkProvider } from "@clerk/clerk-react";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Toaster } from "@/components/ui/sonner";
import { useEffect } from "react";
import { installDashboardDebugTools, recordDashboardError } from "@/lib/dashboard-debug";
import { installA2HSListener, registerServiceWorker } from "@/lib/pwa";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { RouteProgress } from "@/components/common/RouteProgress";

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as
  | string
  | undefined;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">This page doesn't exist or has moved.</p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    recordDashboardError("router:error-boundary", error);
  }, [error]);
  console.error(error);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please try again.</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<Record<string, never>>()({
  // head: is consumed by TanStack Router in SPA mode to update document.title
  // and meta tags after each route match. The links here are not auto-injected
  // in SPA mode; SSR-only stylesheet/manifest links live in frontend/index.html.
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { name: "theme-color", content: "#1F3A5F" },
      { title: "Needool — Global skills directory & marketplace" },
      {
        name: "description",
        content:
          "Find trusted skills, services, and providers worldwide. Hire local talent or connect globally with Needool.",
      },
      {
        property: "og:title",
        content: "Needool — Global skills directory & marketplace",
      },
      {
        property: "og:description",
        content: "Find trusted skills and providers worldwide.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/og-default.svg" },
      { property: "og:image:type", content: "image/svg+xml" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Needool — Global skills directory & marketplace" },
      { name: "twitter:description", content: "Find trusted skills and providers worldwide." },
      { name: "twitter:image", content: "/og-default.svg" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  // shellComponent intentionally NOT set: it renders an <html>/<head>/<body>
  // shell intended for SSR (TanStack START). In SPA mode it nests <html>
  // inside #root, producing invalid DOM that freezes input focus on
  // Chromium/Edge prod builds. See git history "Windows/iOS typing freeze
  // fix" for the prior symptom and Phase 10 diagnosis for the root cause.
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  useEffect(() => {
    installDashboardDebugTools();
    // PRD §15.5 — register the service worker + listen for the A2HS event.
    registerServiceWorker();
    installA2HSListener();
  }, []);

  if (!CLERK_PUBLISHABLE_KEY) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Auth not configured</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Set <code>VITE_CLERK_PUBLISHABLE_KEY</code> in <code>frontend/.env.local</code>
            and restart the dev server.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      signInUrl="/login"
      signUpUrl="/signup"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <ThemeProvider>
        <AuthProvider>
          {/* Phase 10-2 — top-of-viewport progress rail driven by router
              events. Continuity of the boot preloader's rail gradient. */}
          <RouteProgress />
          <Outlet />
        </AuthProvider>
        <Toaster position="top-center" richColors closeButton />
        {/* PRD §15.5 — A2HS install banner. Renders nothing when not available. */}
        <InstallPrompt />
      </ThemeProvider>
    </ClerkProvider>
  );
}
