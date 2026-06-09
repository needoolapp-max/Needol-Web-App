import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
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
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        {/* PRD §15.5 — A2HS install banner. Renders nothing when not available. */}
        <InstallPrompt />
        <Scripts />
      </body>
    </html>
  );
}

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
          <Outlet />
        </AuthProvider>
        <Toaster position="top-center" richColors closeButton />
      </ThemeProvider>
    </ClerkProvider>
  );
}
