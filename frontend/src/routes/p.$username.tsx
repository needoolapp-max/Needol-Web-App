import { createFileRoute, Link } from "@tanstack/react-router";
import { TopNav } from "@/components/nav/TopNav";
import { Footer } from "@/components/nav/Footer";
import { ReviewCard } from "@/components/cards/ReviewCard";
import { LockedField } from "@/components/common/LockedField";
import { getProvider, getProviderReviews } from "@/lib/mockData";
import { useAuth } from "@/context/AuthContext";
import {
  MapPin, BadgeCheck, Clock, DollarSign, Globe, Heart, MessageCircle,
  Star, AlertTriangle, FileText, Link as LinkIcon, Eye,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/p/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — Needool` },
      { name: "description", content: `View ${params.username}'s profile on Needool.` },
    ],
  }),
  component: ProfilePage,
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">Profile not found</h1>
        <Link to="/" className="mt-4 inline-block text-primary font-semibold">Back to home</Link>
      </div>
    </div>
  ),
});

function ProfilePage() {
  const { username } = Route.useParams();
  const provider = getProvider(username);
  const { isLocked, state } = useAuth();
  const [following, setFollowing] = useState(false);

  if (!provider) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">Profile not found</h1>
          <Link to="/" className="mt-4 inline-block text-primary font-semibold">Back to home</Link>
        </div>
      </div>
    );
  }

  const inactive = provider.status === "inactive";
  const reviews = getProviderReviews(provider.id);
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      {/* Cover */}
      <div className="h-32 sm:h-44 bg-gradient-to-br from-primary via-primary to-accent/40" />

      <main className="mx-auto max-w-5xl px-4 -mt-16 sm:-mt-20 pb-16">
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-end gap-5">
            <img src={provider.avatar} alt={provider.name} className="h-24 w-24 sm:h-32 sm:w-32 rounded-3xl border-4 border-card object-cover shadow-md -mt-16 sm:-mt-20" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">{provider.name}</h1>
                {provider.verified && <BadgeCheck className="h-5 w-5 text-primary" />}
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${inactive ? "bg-muted text-muted-foreground" : "bg-success/15 text-success"}`}>
                  {inactive ? "Inactive" : "Active"}
                </span>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{provider.accountType}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">@{provider.username}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {provider.city}, {provider.state}, {provider.country} · {provider.distanceKm < 100 ? `${provider.distanceKm.toFixed(1)} km away` : `${Math.round(provider.distanceKm)} km away`}</span>
              </div>
              <div className="mt-3 flex items-center gap-4 text-sm">
                <span><strong className="text-foreground">{provider.followers.toLocaleString()}</strong> <span className="text-muted-foreground">followers</span></span>
                <span><strong className="text-foreground">{provider.following.toLocaleString()}</strong> <span className="text-muted-foreground">following</span></span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setFollowing((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold border transition ${
                  following ? "bg-muted text-foreground border-border" : "border-border hover:bg-muted"
                }`}
              >
                <Heart className={`h-4 w-4 ${following ? "fill-accent text-accent" : ""}`} /> {following ? "Following" : "Follow"}
              </button>
              {!inactive && (
                <button className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                  <MessageCircle className="h-4 w-4" /> Contact / Hire
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Left main */}
          <div className="space-y-6 min-w-0">
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">About</h2>
              <p className="text-sm leading-relaxed text-foreground/90">{provider.bio}</p>
            </section>

            {provider.skills.length > 0 && (
              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {provider.skills.map((s) => (
                    <span key={s} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">{s}</span>
                  ))}
                </div>
                {provider.services && provider.services.length > 0 && (
                  <>
                    <h3 className="mt-5 text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Services</h3>
                    <div className="flex flex-wrap gap-2">
                      {provider.services.map((s) => (
                        <span key={s} className="rounded-full border border-border bg-card px-3 py-1 text-xs">{s}</span>
                      ))}
                    </div>
                  </>
                )}
              </section>
            )}

            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Reviews</h2>
                <div className="flex items-center gap-1.5 text-sm">
                  <Star className="h-4 w-4 fill-accent text-accent" />
                  <strong className="text-foreground">{avgRating.toFixed(1)}</strong>
                  <span className="text-muted-foreground">({reviews.length})</span>
                </div>
              </div>
              {reviews.length ? (
                <div className="space-y-3">
                  {reviews.map((r) => <ReviewCard key={r.id} r={r} />)}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No reviews yet.</p>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" /> CV / Resume
              </h2>
              <LockedField label="CV is view-only for active members" locked={isLocked}>
                <div className="rounded-xl border border-border bg-muted/40 p-6 text-center">
                  <Eye className="h-6 w-6 mx-auto text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium">CV preview</p>
                  <p className="text-xs text-muted-foreground">View-only · Download disabled by Needool policy</p>
                </div>
              </LockedField>
            </section>

            <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4 flex gap-3 text-sm">
              <AlertTriangle className="h-5 w-5 text-accent-foreground shrink-0 mt-0.5" />
              <p className="text-foreground/80">
                <strong>Needool disclaimer:</strong> Profiles are user-submitted. Always verify credentials and meet in safe locations. Needool does not guarantee outcomes of any hire or transaction.
              </p>
            </div>
          </div>

          {/* Right rail */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Rate</span>
                <span className="ml-auto font-semibold">{provider.hourlyRate ? `${provider.currency} ${provider.hourlyRate}/hr` : "Non-profit"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Hours</span>
                <span className="ml-auto font-semibold text-right">{provider.workHours}</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Remote</span>
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${provider.remote ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                  {provider.remote ? "Available" : "In-person only"}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Contact & Links</h3>
              <LockedField label={`Contact info locked${state === "inactive" ? " (activate your account)" : ""}`} locked={isLocked}>
                <div className="space-y-2 text-sm">
                  <a href="#" className="flex items-center gap-2 text-primary hover:underline">
                    <MessageCircle className="h-4 w-4" /> Message {provider.name.split(" ")[0]}
                  </a>
                  {provider.links.map((l) => (
                    <a key={l.label} href={l.url} className="flex items-center gap-2 text-foreground hover:underline">
                      <LinkIcon className="h-4 w-4 text-muted-foreground" /> {l.label}
                    </a>
                  ))}
                </div>
              </LockedField>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
