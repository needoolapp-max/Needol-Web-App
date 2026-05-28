import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

type ClerkAuthShellProps = {
  children: ReactNode;
  title: string;
  subtitle: string;
};

export function ClerkAuthShell({ children, title, subtitle }: ClerkAuthShellProps) {
  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col items-center justify-center gap-8">
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Needool home"
        >
          <img src="/brand-logo.webp" alt="Needool" className="h-14 w-auto sm:h-16" />
        </Link>

        <section className="w-full max-w-md text-center">
          <h1 className="text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">{subtitle}</p>
        </section>

        <div className="w-full max-w-md">{children}</div>
      </div>
    </main>
  );
}
