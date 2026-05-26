import { Link } from "@tanstack/react-router";
import { Github, Twitter, Linkedin, Instagram, Mail, MapPin, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";

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
      ["About us", "/about"],
      ["Pricing", "/pricing"],
      ["Referrals", "/referrals"],
      ["Help & Guide", "/help"],
      ["Contact", "/contact"],
    ],
  },
  {
    title: "Trust & Legal",
    links: [
      ["Safety", "/safety"],
      ["Privacy Policy", "/privacy"],
      ["Terms of Service", "/terms"],
      ["Cookie Policy", "/cookies"],
    ],
  },
] as const;

const ADMIN_PANEL_URL = import.meta.env.VITE_ADMIN_PANEL_URL ?? "http://localhost:3200";

export function Footer() {
  return (
    <footer className="border-t border-border bg-sidebar">

      {/* Upper footer */}
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 lg:grid-cols-[1.3fr_2fr]">
        {/* Brand column */}
        <div>
          <Link to="/" className="inline-block rounded-lg">
            <img src="/brand-logo.webp" alt="Needool" width="149" height="120" loading="lazy" className="h-14 w-auto" />
          </Link>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Global skills, found locally.
          </p>
          <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">
            A global skills directory, service marketplace, Need Request board, opportunities hub, and hiring workflow built for Africa and beyond.
          </p>
          <div className="mt-5 space-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Nigeria soft launch, globally accessible</span>
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Active-first trust ranking</span>
          </div>

          {/* Social links */}
          <div className="mt-6 flex items-center gap-2">
            {[
              { Icon: Twitter, label: "Twitter" },
              { Icon: Linkedin, label: "LinkedIn" },
              { Icon: Instagram, label: "Instagram" },
              { Icon: Github, label: "GitHub" },
            ].map(({ Icon, label }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition hover:border-primary hover:bg-primary/10 hover:text-primary"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
            <a
              href="mailto:hello@needool.com"
              className="ml-1 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
            >
              <Mail className="h-4 w-4" /> Email us
            </a>
          </div>
        </div>

        {/* Link groups */}
        <div className="grid gap-8 sm:grid-cols-3">
          {footerGroups.map((group) => (
            <nav key={group.title} className="space-y-3 text-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/60">{group.title}</h3>
              <div className="space-y-2.5">
                {group.links.map(([label, to]) => (
                  <Link
                    key={to}
                    to={to}
                    className="block text-muted-foreground transition hover:text-primary"
                  >
                    {label}
                  </Link>
                ))}
                {group.title === "Trust & Legal" && (
                  <a href={ADMIN_PANEL_URL} className="block text-muted-foreground transition hover:text-primary">
                    Admin panel
                  </a>
                )}
              </div>
            </nav>
          ))}
        </div>
      </div>

      {/* CTA strip */}
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Ready to list your skills or find a provider?
          </div>
          <div className="flex gap-3">
            <Link to="/search" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary">
              Browse providers
            </Link>
            <Link to="/signup" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-md transition hover:-translate-y-0.5">
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border/40">
        <div className="mx-auto flex max-w-7xl flex-col gap-1.5 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Needool. All rights reserved.</span>
          <span>Built for active providers. Powered by trust.</span>
        </div>
      </div>
    </footer>
  );
}
