import { Link } from "@tanstack/react-router";
import { Github, Twitter, Linkedin, Instagram, Mail, MapPin, ShieldCheck } from "lucide-react";

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
    title: "Trust",
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
    <footer className="mt-20 border-t border-border bg-sidebar">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 lg:grid-cols-[1.25fr_2fr]">
        <div>
          <div className="flex items-center gap-3">
            <img src="/brand-logo.webp" alt="Needool" width="149" height="120" loading="lazy" className="h-16 w-auto" />
          </div>
          <div className="mt-2 text-xs text-muted-foreground">Global skills, found locally.</div>
          <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
            Needool is a dummy MVP for a global skills directory, service marketplace, Need Request board, opportunities hub, and admin-managed hiring workflow.
          </p>
          <div className="mt-5 grid gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Nigeria soft launch, globally accessible</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Mock data only; production API keys pending</span>
          </div>
          <div className="mt-5 flex items-center gap-2">
            {[Twitter, Linkedin, Instagram, Github].map((Icon, i) => (
              <a key={i} href="#" className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground">
                <Icon className="h-4 w-4" />
              </a>
            ))}
            <a href="mailto:hello@needool.com" className="ml-2 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-muted">
              <Mail className="h-4 w-4" /> Contact
            </a>
          </div>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          {footerGroups.map((group) => (
            <nav key={group.title} className="space-y-3 text-sm">
              <h3 className="text-sm font-bold text-foreground">{group.title}</h3>
              {group.links.map(([label, to]) => (
                <Link key={to} to={to} className="block text-muted-foreground hover:text-foreground">
                  {label}
                </Link>
              ))}
              {group.title === "Trust" && (
                <a href={ADMIN_PANEL_URL} className="block text-muted-foreground hover:text-foreground">Admin panel</a>
              )}
            </nav>
          ))}
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Needool. All rights reserved.</span>
          <span>Dummy MVP for local product inspection. No real payments, payouts, maps, emails, or blockchain writes.</span>
        </div>
      </div>
    </footer>
  );
}
