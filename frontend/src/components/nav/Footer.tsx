import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Github,
  Instagram,
  Linkedin,
  Mail,
  Twitter,
} from "lucide-react";

/**
 * Phase 10-2 — Editorial colophon. Full-width top rule, oversized
 * "NEEDOOL" wordmark set as a typographic object, link columns with mono
 * group labels, mono bottom colophon line. Replaces the previous
 * 3-column logo/social/columns footer.
 */
const footerGroups = [
  {
    title: "Marketplace",
    links: [
      ["Find providers", "/search"],
      ["Need Requests", "/needs"],
      ["Opportunities", "/opportunities"],
      ["Job Openings", "/jobs"],
      ["Events", "/events"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About", "/about"],
      ["Pricing", "/pricing"],
      ["Referrals", "/referrals"],
      ["Help", "/help"],
      ["Contact", "/contact"],
    ],
  },
  {
    title: "Trust & Legal",
    links: [
      ["Safety", "/safety"],
      ["Privacy", "/privacy"],
      ["Terms", "/terms"],
      ["Cookies", "/cookies"],
    ],
  },
] as const;

const ADMIN_PANEL_URL = import.meta.env.VITE_ADMIN_PANEL_URL ?? "http://localhost:3200";

const SOCIALS = [
  { Icon: Twitter, label: "Twitter", href: "#" },
  { Icon: Linkedin, label: "LinkedIn", href: "#" },
  { Icon: Instagram, label: "Instagram", href: "#" },
  { Icon: Github, label: "GitHub", href: "#" },
] as const;

export function Footer() {
  return (
    <footer className="block w-full border-t-2 border-foreground bg-background text-foreground">
      {/* ── Editorial wordmark + link columns ── */}
      <div className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 lg:pt-20">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
          {/* Wordmark column */}
          <div>
            <Link
              to="/"
              aria-label="Needool home"
              className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="block font-heading text-[clamp(3rem,11vw,7rem)] font-extrabold leading-[0.92] tracking-[-0.04em] text-foreground">
                NEEDOOL
              </span>
            </Link>
            <p className="mt-6 max-w-md text-sm leading-7 text-muted-foreground">
              A global skills directory, service marketplace, Need Request board,
              opportunities hub, and hiring workflow built for Africa and
              beyond.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-2">
              {SOCIALS.map(({ Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="grid h-10 w-10 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
              <a
                href="mailto:hello@needool.com"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              >
                <Mail className="h-3.5 w-3.5" />
                hello@needool.com
              </a>
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {footerGroups.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {group.title}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {group.links.map(([label, to]) => (
                    <li key={to}>
                      <Link
                        to={to}
                        className="text-sm text-foreground/80 underline-offset-4 transition-colors hover:text-foreground hover:underline"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                  {group.title === "Trust & Legal" && (
                    <li>
                      <a
                        href={ADMIN_PANEL_URL}
                        className="inline-flex items-center gap-1 text-sm text-foreground/60 underline-offset-4 transition-colors hover:text-foreground hover:underline"
                      >
                        Admin panel
                        <ArrowUpRight className="h-3 w-3" />
                      </a>
                    </li>
                  )}
                </ul>
              </nav>
            ))}
          </div>
        </div>
      </div>

      {/* ── Mono colophon line ── */}
      <div className="mx-auto mt-14 max-w-7xl border-t border-border px-4 py-5 sm:px-6">
        <p className="flex flex-col gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; 2026 Needool &middot; Lagos &rarr; Worldwide</span>
          <span>All systems operational</span>
        </p>
      </div>
    </footer>
  );
}
