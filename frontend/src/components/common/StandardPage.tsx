import { TopNav } from "@/components/nav/TopNav";
import { Footer } from "@/components/nav/Footer";

/**
 * Phase 10-2 — Document treatment for static / legal pages. Replaces the
 * boxed-card "section" rows with numbered editorial entries under hairline
 * rules, capped at a 65ch measure for readable body type. The leading
 * mono kicker reads like a chapter index.
 */
type Section = {
  title: string;
  body: string;
};

type StandardPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  sections: Section[];
  /** Optional "LAST UPDATED" line in the masthead, e.g. "2026-06-12". */
  lastUpdated?: string;
};

export function StandardPage({
  eyebrow,
  title,
  description,
  sections,
  lastUpdated,
}: StandardPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-5xl px-4 py-12">
        <header className="border-t-2 border-foreground pt-6">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {eyebrow}
            {lastUpdated && (
              <span className="ml-4 text-foreground/70">
                Last updated &middot; {lastUpdated}
              </span>
            )}
          </p>
          <h1 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-[65ch] text-base leading-[1.75] text-muted-foreground">
            {description}
          </p>
        </header>

        <ol className="mt-12 divide-y divide-border border-y border-border">
          {sections.map((section, i) => (
            <li
              key={section.title}
              className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 py-8 sm:grid-cols-[5rem_1fr] sm:gap-x-10 sm:py-10"
            >
              <span
                aria-hidden
                className="font-mono text-sm font-semibold tracking-[0.16em] text-foreground"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="col-start-2 max-w-[65ch]">
                <h2 className="font-heading text-xl font-bold text-foreground sm:text-2xl">
                  {section.title}
                </h2>
                <p className="mt-3 text-base leading-[1.75] text-muted-foreground">
                  {section.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </main>
      <Footer />
    </div>
  );
}
