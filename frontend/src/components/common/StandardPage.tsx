import { TopNav } from "@/components/nav/TopNav";
import { Footer } from "@/components/nav/Footer";

type Section = {
  title: string;
  body: string;
};

type StandardPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  sections: Section[];
};

export function StandardPage({ eyebrow, title, description, sections }: StandardPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-5xl px-4 py-12">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-extrabold text-foreground sm:text-4xl">{title}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">{description}</p>
        <div className="mt-10 grid gap-4">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold text-foreground">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
