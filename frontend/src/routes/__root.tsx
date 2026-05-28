import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { ClerkProvider } from "@clerk/clerk-react";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Toaster } from "@/components/ui/sonner";
import { useEffect } from "react";
import { installDashboardDebugTools, recordDashboardError } from "@/lib/dashboard-debug";

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? "";
const CLERK_AUTH_PAGE_MODE = import.meta.env.VITE_CLERK_AUTH_PAGE_MODE ?? "hosted";

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
        <Scripts />
      </body>
    </html>
  );
}

function ConfigErrorScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Configuration error</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign-in is unavailable because this build is missing its authentication key
          (VITE_CLERK_PUBLISHABLE_KEY). Please contact support.
        </p>
      </div>
    </div>
  );
}

function RootComponent() {
  const location = useLocation();
  const isAuthRoute =
    location.pathname === "/login" ||
    location.pathname === "/signup" ||
    location.pathname === "/sso-callback";
  const clerkAuthRoutingProps =
    CLERK_AUTH_PAGE_MODE === "embedded" ? { signInUrl: "/login", signUpUrl: "/signup" } : {};

  useEffect(() => {
    installDashboardDebugTools();
  }, []);

  // Guard: an empty publishableKey makes ClerkProvider behave unpredictably
  // (hangs/never loads). Fail loudly instead so the cause is obvious.
  if (!CLERK_PUBLISHABLE_KEY) {
    return (
      <ThemeProvider>
        <ConfigErrorScreen />
      </ThemeProvider>
    );
  }

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      {...clerkAuthRoutingProps}
      afterSignOutUrl="/"
      signInForceRedirectUrl="/dashboard"
      signUpForceRedirectUrl="/dashboard"
    >
      <ThemeProvider>
        {isAuthRoute ? (
          <Outlet />
        ) : (
          <AuthProvider>
            <Outlet />
          </AuthProvider>
        )}
        <Toaster position="top-center" richColors closeButton />
      </ThemeProvider>
    </ClerkProvider>
  );
}
