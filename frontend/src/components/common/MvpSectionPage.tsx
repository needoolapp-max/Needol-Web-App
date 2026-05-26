import { TopNav } from "@/components/nav/TopNav";
import { Footer } from "@/components/nav/Footer";
import { GlowCard } from "@/components/ui/spotlight-card";
import type { MvpItem } from "@/lib/mvpData";
import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";

type Props = {
  title: string;
  description: string;
  items: MvpItem[];
  note: string;
};

export function MvpSectionPage({ title, description, items, note }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section>
            <div className="mb-6 max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Needool dummy MVP</p>
              <h1 className="mt-2 text-3xl font-extrabold text-foreground sm:text-4xl">{title}</h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((item) => (
                <GlowCard key={item.id} customSize className="flex flex-col rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{item.eyebrow}</p>
                      <h2 className="mt-1 text-lg font-bold text-foreground">{item.title}</h2>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">{item.status}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-foreground/80">{item.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground/75">{tag}</span>
                    ))}
                  </div>
                  <div className="mt-4 space-y-1 border-t border-border pt-4 text-xs text-muted-foreground">
                    {item.meta.map((line) => (
                      <div key={line} className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>
                  {item.cta && (
                    <button className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                      {item.cta} <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </GlowCard>
              ))}
            </div>
          </section>

          <aside className="space-y-4">
            <GlowCard customSize className="rounded-2xl p-5">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                API-free demo
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{note}</p>
            </GlowCard>
            <GlowCard customSize className="rounded-2xl p-5">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <LockKeyhole className="h-4 w-4 text-accent" />
                Integration placeholders
              </div>
              <p className="mt-2 text-sm leading-6 text-foreground/80">
                Maps, Supabase, NowPayments, Resend, TOTP, CV parsing, web push, and Polygon anchoring are represented with dummy text and local data.
              </p>
            </GlowCard>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
