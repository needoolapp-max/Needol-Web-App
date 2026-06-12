import { createFileRoute, Link } from "@tanstack/react-router";
import { TopNav } from "@/components/nav/TopNav";
import { Footer } from "@/components/nav/Footer";
import { LockedField } from "@/components/common/LockedField";
import { ReviewsSection } from "@/components/profile/ReviewsSection";
import { getProvider, getProviderReviews, type Provider } from "@/lib/mockData";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { profileJsonLd } from "@/lib/seo";
import {
  MapPin, BadgeCheck, Clock, DollarSign, Globe, Heart, MessageCircle,
  AlertTriangle, FileText, Link as LinkIcon, Eye, Star, X as XIcon, Bell,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// PRD §3.2 — full public profile response.
type LiveSkill = { id: string; kind: "skill" | "product" | "service"; label: string; category?: string | null };
type LiveLink = { id: string; label: string; url: string };
type LivePost = {
  id: string;
  kind: "need" | "opportunity" | "event";
  title: string;
  description?: string;
  thumbnail_url?: string | null;
  status: string;
  created_at?: string;
  pinned?: boolean;
};

type LiveProfile = {
  id: string;
  username: string;
  name: string;
  avatar?: string;
  accountType: "Individual" | "Business";
  status: "active" | "inactive" | "restricted" | "banned";
  bio: string | null;
  hourlyRate: number | null;
  currency: string | null;
  workHours: string | null;
  remote: boolean;
  country: string | null;
  state: string | null;
  city: string | null;
  businessAddress: string | null;
  distanceKm: number | null;
  skills: LiveSkill[];
  phone: string | null;
  whatsapp: string | null;
  links: LiveLink[];
  cvUrl: string | null;
  followers: number;
  following: number;
  isFollowing: boolean;
  isSelf: boolean;
  posts: LivePost[];
  reviews: Array<{ id: string; rating: number; comment?: string | null; reviewer_id?: string | null; created_at?: string }>;
  reviewAggregate: { average: number; count: number };
  notifyWhenActiveAvailable: boolean;
};
type ProfileResponse = { data: LiveProfile };

export const Route = createFileRoute("/p/$username")({
  head: ({ params }) => {
    const title = `@${params.username} — Needool`;
    const description = `View ${params.username}'s profile on Needool — skills, services, reviews, and contact.`;
    const url = `${(import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) || "https://needool.com"}/p/${params.username}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:url", content: url },
        { property: "og:type", content: "profile" },
        { property: "og:description", content: description },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [
        { rel: "canonical", href: url },
      ],
    };
  },
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
  const mockProvider = getProvider(username);
  const { isLocked, state, user, getToken, loading: authLoading } = useAuth();
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [isSelf, setIsSelf] = useState(false);
  const [liveProfile, setLiveProfile] = useState<LiveProfile | null>(null);
  const [profileResolved, setProfileResolved] = useState(false);
  const [canReview, setCanReview] = useState<{ canReview: boolean; reason?: string } | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const [reviewSubmittedKey, setReviewSubmittedKey] = useState(0);
  const [notifyMessage, setNotifyMessage] = useState<string | null>(null);
  const [notifyBusy, setNotifyBusy] = useState(false);
  const canInteract = user?.status === "active";

  // PRD §3.4 — log contact reveal. No-op for visitors (server treats it as 204).
  const logContactIntent = useCallback(async (intentType: "phone" | "whatsapp" | "link" | "cv", linkUrl?: string) => {
    if (!profileUserId) return;
    try {
      await apiFetch(`/api/profiles/${encodeURIComponent(profileUserId)}/contact-intent`, {
        method: "POST",
        getToken,
        body: JSON.stringify({ type: intentType, linkUrl }),
      });
    } catch {
      // best-effort; non-fatal
    }
  }, [profileUserId, getToken]);

  // PRD §3.3 — request notification when the target activates.
  const requestNotifyWhenActive = useCallback(async () => {
    if (!profileUserId) return;
    if (!user) {
      setNotifyMessage("Sign in to request a notification.");
      return;
    }
    setNotifyBusy(true);
    setNotifyMessage(null);
    try {
      const r = await apiFetch<{ data: { created: boolean; expiresAt: string } }>(
        `/api/profiles/${encodeURIComponent(profileUserId)}/notify-when-active`,
        { method: "POST", getToken },
      );
      setNotifyMessage(
        r.data.created
          ? "Got it — we'll notify you if this member activates in the next 30 days."
          : "You already have a pending request for this member.",
      );
    } catch (err) {
      setNotifyMessage(err instanceof Error ? err.message : "Could not request notification.");
    } finally {
      setNotifyBusy(false);
    }
  }, [profileUserId, user, getToken]);

  const loadProfile = useCallback(async () => {
    try {
      const r = await apiFetch<ProfileResponse>(`/api/users/by-username/${encodeURIComponent(username)}`, { getToken });
      setLiveProfile(r.data);
      setProfileUserId(r.data.id);
      setFollowing(r.data.isFollowing);
      setFollowers(r.data.followers);
      setFollowingCount(r.data.following);
      setIsSelf(r.data.isSelf);
    } catch {
      // User isn't in our DB yet (e.g. legacy mockData-only provider); keep mock-only follow.
      setLiveProfile(null);
      setProfileUserId(null);
    } finally {
      setProfileResolved(true);
    }
  }, [username, getToken]);

  useEffect(() => {
    if (authLoading) return;
    setProfileResolved(false);
    void loadProfile();
  }, [authLoading, loadProfile, user?.id]);

  // PRD §4.4 — inject Person / LocalBusiness JSON-LD once we have live data.
  useEffect(() => {
    if (!liveProfile) return;
    const id = "needool-profile-jsonld";
    const existing = document.getElementById(id);
    const ld = profileJsonLd({
      username: liveProfile.username,
      name: liveProfile.name,
      accountType: liveProfile.accountType,
      bio: liveProfile.bio,
      avatar: liveProfile.avatar,
      country: liveProfile.country,
      state: liveProfile.state,
      city: liveProfile.city,
    });
    if (existing) {
      existing.textContent = ld;
    } else {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = id;
      script.textContent = ld;
      document.head.appendChild(script);
    }
    return () => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, [liveProfile]);

  const loadEligibility = useCallback(async () => {
    if (!profileUserId || !user || isSelf) {
      setCanReview(null);
      return;
    }
    try {
      const r = await apiFetch<{ data: { canReview: boolean; reason?: string } }>(
        `/api/profiles/${encodeURIComponent(profileUserId)}/can-review`,
        { getToken },
      );
      setCanReview(r.data);
    } catch {
      setCanReview(null);
    }
  }, [profileUserId, user, isSelf, getToken]);

  useEffect(() => { void loadEligibility(); }, [loadEligibility, reviewSubmittedKey]);

  async function submitTriggerBReview({ rating, comment, evidenceUrl }: { rating: number; comment: string; evidenceUrl?: string }) {
    if (!profileUserId) return;
    setReviewBusy(true);
    setReviewMessage(null);
    try {
      const r = await apiFetch<{ data: { id: string; status: string } }>(
        `/api/profiles/${encodeURIComponent(profileUserId)}/reviews`,
        {
          method: "POST",
          getToken,
          body: JSON.stringify({ rating, comment, evidenceUrl }),
        },
      );
      setReviewMessage(
        r.data.status === "held"
          ? "Submitted. Held for admin pre-approval per Needool's anti-abuse policy."
          : "Submitted. Your review is live on this profile.",
      );
      setReviewOpen(false);
      setReviewSubmittedKey((k) => k + 1);
    } catch (err) {
      setReviewMessage(err instanceof Error ? err.message : "Could not submit review.");
    } finally {
      setReviewBusy(false);
    }
  }

  async function toggleFollow() {
    if (!user || !profileUserId || isSelf) return;
    const wasFollowing = following;
    try {
      const r = await apiFetch<{ data: { following: boolean; followers: number } }>(
        `/api/users/${encodeURIComponent(profileUserId)}/follow`,
        { method: wasFollowing ? "DELETE" : "POST", getToken },
      );
      setFollowing(r.data.following);
      setFollowers(r.data.followers);
    } catch {
      /* ignore */
    }
  }

  // PRD §3.2 — live DB data is the primary source; mockData is the legacy
  // fallback for seeded demo profiles (ada.codes etc.) that haven't been
  // recreated in Supabase. Live data wins when both exist.
  const provider = liveProfile
    ? liveProfileProvider(liveProfile, mockProvider)
    : mockProvider;

  if (!provider && (!profileResolved || authLoading)) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <p className="text-sm text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

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
  // PRD §3.2 — reviews are live when DB has them, fall back to mockData seed.
  const reviews = liveProfile?.reviews && liveProfile.reviews.length > 0
    ? []  // ReviewsSection re-fetches and renders live; passing [] forces it to use its API call.
    : getProviderReviews(provider.id);
  const location = [provider.city, provider.state, provider.country].filter(Boolean).join(", ") || "Location not provided";
  const liveDistance = liveProfile?.distanceKm ?? null;
  const distance = liveDistance != null
    ? ` (${liveDistance < 100 ? `${liveDistance.toFixed(1)} km away` : `${Math.round(liveDistance)} km away`})`
    : provider.distanceKm > 0
      ? ` (${provider.distanceKm < 100 ? `${provider.distanceKm.toFixed(1)} km away` : `${Math.round(provider.distanceKm)} km away`})`
      : "";
  // PRD §3.2 contact reveal — server already gated; if live data omits a
  // field, treat it as locked rather than falling back to mock.
  const liveLinks = liveProfile?.links ?? null;
  const liveCvUrl = liveProfile?.cvUrl ?? null;
  const livePosts = liveProfile?.posts ?? [];

  // Phase 10-2 — Editorial Trust Ledger masthead: no cover image, no
  // boxed identity card. A 2px top rule, an Urbanist 800 name, and a
  // mono "registry line" with the username, location, distance, account
  // type, and status. The previous gradient cover + rounded-3xl card +
  // soft drop shadow stack was the loudest "AI profile template"
  // signature; this anatomy reads like a public registry entry instead.
  const profileCity = [provider.city, provider.state, provider.country].filter(Boolean).join(", ");
  const registryParts = [
    `@${provider.username}`,
    profileCity || null,
    distance ? distance.replace(/[\s()]/g, "").toUpperCase() : null,
    provider.accountType,
    inactive ? "Inactive" : "Active",
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-10">
        {/* Identity masthead */}
        <header className="border-t-2 border-foreground pt-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            {registryParts.join(" · ")}
          </p>
          <div className="mt-3 flex flex-wrap items-start gap-5 sm:flex-nowrap">
            <img
              src={provider.avatar}
              alt={provider.name}
              loading="eager"
              decoding="async"
              width={112}
              height={112}
              className="h-20 w-20 rounded-lg object-cover ring-1 ring-border sm:h-28 sm:w-28"
            />
            <div className="min-w-0 flex-1">
              <h1 className="font-heading text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl">
                {provider.name}
                {provider.verified && (
                  <BadgeCheck
                    className="ml-2 inline h-6 w-6 align-middle text-primary"
                    aria-label="Verified provider"
                  />
                )}
              </h1>
              <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">
                {provider.bio || "No bio yet."}
              </p>
            </div>
          </div>
        </header>

        {/* Phase 10-2 — Editorial action bar. Hairline strip with mono
            follower / following meta on the left and a row of ledger-style
            buttons on the right. Primary action (Contact / Hire) is the
            only dark monochrome CTA; everything else is hairline-bordered
            with ink-on-hover. No rounded-xl pills, no primary-tinted
            backgrounds. */}
        <div className="mt-6 border-t border-border pt-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 text-foreground">
                  <MapPin className="h-3 w-3" /> {location}
                </span>
              </div>
              <div
                className="mt-2 flex items-center gap-4 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground"
                data-test="profile-counts"
              >
                <span>
                  <strong
                    className="font-semibold text-foreground"
                    data-test="follower-count"
                  >
                    {(followers ?? provider.followers).toLocaleString()}
                  </strong>{" "}
                  Followers
                </span>
                <span aria-hidden className="h-3 w-px bg-border" />
                <span>
                  <strong className="font-semibold text-foreground">
                    {(followingCount ?? provider.following).toLocaleString()}
                  </strong>{" "}
                  Following
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={toggleFollow}
                disabled={!canInteract || isSelf || !profileUserId}
                data-test="follow-button"
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  following
                    ? "border-foreground bg-secondary text-foreground"
                    : "border-border bg-card text-foreground hover:border-foreground"
                }`}
                title={
                  isSelf
                    ? "This is your profile"
                    : !user
                      ? "Sign in to follow"
                      : !canInteract
                        ? "Activate your account to follow"
                        : following
                          ? "Unfollow"
                          : "Follow"
                }
              >
                <Heart
                  className={`h-3.5 w-3.5 ${following ? "fill-foreground text-foreground" : ""}`}
                />{" "}
                {isSelf ? "You" : following ? "Following" : "Follow"}
              </button>
              {!inactive && (
                <button className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-bold text-background transition-opacity hover:opacity-90">
                  <MessageCircle className="h-3.5 w-3.5" /> Contact / Hire
                </button>
              )}
              {/* PRD §3.3 — Notify when active. Live profile flag tells us
                  whether the target is Inactive and the viewer is not self. */}
              {liveProfile?.notifyWhenActiveAvailable && (
                <button
                  data-test="notify-when-active-button"
                  onClick={requestNotifyWhenActive}
                  disabled={notifyBusy}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold transition-colors hover:border-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  title="We'll notify you if this member activates in the next 30 days."
                >
                  <Bell className="h-3.5 w-3.5" /> Notify when active
                </button>
              )}
              {user && !isSelf && profileUserId && (
                <button
                  data-test="leave-review-button"
                  disabled={!canReview?.canReview}
                  onClick={() => setReviewOpen(true)}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold transition-colors hover:border-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  title={
                    canReview?.canReview
                      ? "Leave a member review"
                      : canReview?.reason || "Not eligible to review yet"
                  }
                >
                  <Star className="h-3.5 w-3.5" /> Leave a review
                </button>
              )}
            </div>
          </div>
          {reviewMessage && (
            <p
              data-test="review-message"
              className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
            >
              {reviewMessage}
            </p>
          )}
          {notifyMessage && (
            <p
              data-test="notify-message"
              className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
            >
              {notifyMessage}
            </p>
          )}
        </div>
        {reviewOpen && profileUserId && (
          <TriggerBReviewModal
            onClose={() => setReviewOpen(false)}
            onSubmit={submitTriggerBReview}
            busy={reviewBusy}
            targetName={provider?.name || liveProfile?.name || "this member"}
          />
        )}

        <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_320px]">
          {/* Left main — numbered editorial sections; ruled lists; no card chrome. */}
          <div className="min-w-0 space-y-12">
            <ProfileSection number="01" kicker="About">
              <p className="text-base leading-[1.75] text-foreground/90">
                {provider.bio || "No bio yet."}
              </p>
            </ProfileSection>

            {(provider.skills.length > 0 || (provider.services?.length ?? 0) > 0) && (
              <ProfileSection number="02" kicker="Skills & services">
                {provider.skills.length > 0 && (
                  <>
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/70">
                      Skills
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] uppercase tracking-[0.14em] text-foreground/85">
                      {provider.skills.map((s, i) => (
                        <span key={s} className="inline-flex items-center gap-2">
                          {i > 0 && (
                            <span aria-hidden className="text-muted-foreground/60">&middot;</span>
                          )}
                          {s}
                        </span>
                      ))}
                    </div>
                  </>
                )}
                {provider.services && provider.services.length > 0 && (
                  <div className="mt-5">
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/70">
                      Services
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] uppercase tracking-[0.14em] text-foreground/85">
                      {provider.services.map((s, i) => (
                        <span key={s} className="inline-flex items-center gap-2">
                          {i > 0 && (
                            <span aria-hidden className="text-muted-foreground/60">&middot;</span>
                          )}
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </ProfileSection>
            )}

            <ProfileSection number="03" kicker="Reviews">
              <ReviewsSection
                userId={provider.id}
                fallbackReviews={reviews}
                viewerUserId={user?.id || null}
              />
            </ProfileSection>

            {livePosts.length > 0 && (
              <ProfileSection
                number="04"
                kicker="Posts"
                meta={String(livePosts.length).padStart(2, "0")}
              >
                <ul
                  data-test="profile-posts"
                  className="divide-y divide-border border-y border-border"
                >
                  {livePosts.map((p) => (
                    <li
                      key={p.id}
                      data-test="profile-post"
                      data-post-id={p.id}
                      className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 py-5"
                    >
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/70">
                        {p.kind}
                        {p.pinned && (
                          <span className="ml-2 text-primary">Pinned</span>
                        )}
                      </span>
                      <div className="col-start-2 min-w-0">
                        <Link
                          to="/posts/$id"
                          params={{ id: p.id }}
                          className="block font-heading text-base font-semibold text-foreground transition-colors hover:text-primary"
                        >
                          {p.title}
                        </Link>
                        {p.description && (
                          <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                            {p.description}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </ProfileSection>
            )}

            <ProfileSection
              number={livePosts.length > 0 ? "05" : "04"}
              kicker="CV / Resume"
              icon={FileText}
            >
              <LockedField
                label="CV is view-only for active members"
                locked={isLocked}
              >
                {liveCvUrl ? (
                  <div
                    data-test="profile-cv-viewer"
                    className="overflow-hidden border border-border bg-muted/30"
                  >
                    <object
                      data={liveCvUrl}
                      type="application/pdf"
                      className="h-[480px] w-full"
                    >
                      <p className="p-6 text-center text-sm text-muted-foreground">
                        Your browser cannot preview this PDF.
                      </p>
                    </object>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 border border-dashed border-border py-10 text-center">
                    <Eye className="h-5 w-5 text-muted-foreground" />
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">
                      No CV uploaded
                    </p>
                    <p className="text-xs text-muted-foreground">
                      This member hasn't uploaded a CV yet.
                    </p>
                  </div>
                )}
              </LockedField>
            </ProfileSection>

            {/* Editorial disclaimer — hairline strip, mono kicker, no
                accent-tinted alert box. */}
            <aside className="flex flex-col gap-2 border-y border-border py-5 text-sm leading-7">
              <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/85">
                <AlertTriangle className="h-3.5 w-3.5" /> Disclaimer
              </div>
              <p className="text-muted-foreground">
                Profiles are user-submitted. Always verify credentials and meet
                in safe locations. Needool does not guarantee outcomes of any
                hire or transaction.
              </p>
            </aside>
          </div>

          {/* Right rail — sticky ruled list. No card chrome. */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            {/* Quick facts ledger */}
            <div>
              <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/70">
                At a glance
              </h3>
              <dl className="mt-3 divide-y divide-border border-y border-border">
                <RailRow
                  icon={DollarSign}
                  label="Rate"
                  value={
                    provider.hourlyRate
                      ? `${provider.currency} ${provider.hourlyRate}/hr`
                      : provider.accountType === "NGO"
                        ? "Non-profit"
                        : "Not provided"
                  }
                />
                <RailRow
                  icon={Clock}
                  label="Hours"
                  value={provider.workHours}
                />
                <RailRow
                  icon={Globe}
                  label="Remote"
                  value={provider.remote ? "Available" : "In-person only"}
                  status={provider.remote ? "ok" : "off"}
                />
              </dl>
            </div>

            {/* Contact & Links — ruled list */}
            <div className="mt-10">
              <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/70">
                Contact &amp; Links
              </h3>
              <LockedField
                label={`Contact info locked${state === "inactive" ? " (activate your account)" : ""}`}
                locked={
                  isLocked ||
                  (liveProfile != null && !liveLinks?.length && inactive)
                }
              >
                <ul
                  data-test="profile-contact-block"
                  className="mt-3 divide-y divide-border border-y border-border"
                >
                  <li>
                    <a
                      href="#"
                      className="flex items-center justify-between gap-3 py-3 text-sm font-semibold text-foreground transition-colors hover:text-primary"
                    >
                      <span className="inline-flex items-center gap-2">
                        <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        Message {provider.name.split(" ")[0]}
                      </span>
                      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        Chat
                      </span>
                    </a>
                  </li>
                  {liveProfile?.phone && (
                    <li>
                      <a
                        href={`tel:${liveProfile.phone}`}
                        onClick={() => void logContactIntent("phone")}
                        data-test="profile-phone"
                        className="flex items-center justify-between gap-3 py-3 text-sm text-foreground transition-colors hover:text-primary"
                      >
                        <span className="inline-flex items-center gap-2">
                          <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          Phone
                        </span>
                        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/80">
                          {liveProfile.phone}
                        </span>
                      </a>
                    </li>
                  )}
                  {liveProfile?.whatsapp && (
                    <li>
                      <a
                        href={`https://wa.me/${liveProfile.whatsapp.replace(/[^\d+]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => void logContactIntent("whatsapp")}
                        data-test="profile-whatsapp"
                        className="flex items-center justify-between gap-3 py-3 text-sm text-foreground transition-colors hover:text-primary"
                      >
                        <span className="inline-flex items-center gap-2">
                          <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          WhatsApp
                        </span>
                        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          Open
                        </span>
                      </a>
                    </li>
                  )}
                  {(liveLinks ?? provider.links).map((l) => (
                    <li key={l.label + l.url}>
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => void logContactIntent("link", l.url)}
                        data-test="profile-link"
                        className="flex items-center justify-between gap-3 py-3 text-sm text-foreground transition-colors hover:text-primary"
                      >
                        <span className="inline-flex items-center gap-2">
                          <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          {l.label}
                        </span>
                        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          Visit
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </LockedField>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// Phase 10-2 — Numbered editorial section on the profile page. Index in
// font-mono, kicker in uppercase mono, optional inline icon next to the
// kicker, optional right-aligned meta (e.g. "07" for a count). No card
// chrome; sits on a 2px-foreground top rule like every other ledger
// section sitewide.
function ProfileSection({
  number,
  kicker,
  meta,
  icon: Icon,
  children,
}: {
  number: string;
  kicker: string;
  meta?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t-2 border-foreground pt-6">
      <header className="mb-5 flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-4">
          <span
            aria-hidden
            className="font-mono text-sm font-semibold tracking-[0.16em] text-foreground"
          >
            {number}
          </span>
          <span className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/85">
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {kicker}
          </span>
        </div>
        {meta && (
          <span className="font-mono text-[11px] font-semibold tracking-[0.16em] text-foreground/70">
            {meta}
          </span>
        )}
      </header>
      {children}
    </section>
  );
}

// Phase 10-2 — Ruled right-rail row. icon + label on the left, value on
// the right. Optional `status` colors the value mono tag (ok = success,
// off = muted).
function RailRow({
  icon: Icon,
  label,
  value,
  status,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  status?: "ok" | "off";
}) {
  const valueClass =
    status === "ok"
      ? "text-success"
      : status === "off"
        ? "text-muted-foreground"
        : "text-foreground";
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <dt className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/70">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
      </dt>
      <dd
        className={`text-right font-mono text-[11px] font-semibold uppercase tracking-[0.18em] ${valueClass}`}
      >
        {value}
      </dd>
    </div>
  );
}

function TriggerBReviewModal({
  onClose,
  onSubmit,
  busy,
  targetName,
}: {
  onClose: () => void;
  onSubmit: (input: { rating: number; comment: string; evidenceUrl?: string }) => void;
  busy: boolean;
  targetName: string;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const evidenceRequired = rating === 1 || rating === 2;
  const heldNote = evidenceRequired
    ? "Low-rated reviews are held for admin pre-approval before going public."
    : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      data-test="review-modal"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/70">
              Review
            </span>
            <h3 className="font-heading text-lg font-bold text-foreground">{targetName}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Close"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Editable for 14 days &middot; then locked
        </p>

        <div className="mt-5">
          <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/80">
            Rating
          </label>
          <div className="mt-2 flex items-center gap-1" data-test="review-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                data-test={`review-star-${n}`}
                onClick={() => setRating(n)}
                className="p-1"
                aria-label={`${n} stars`}
              >
                <Star
                  className={`h-6 w-6 ${
                    n <= rating
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <label
            htmlFor="rev-comment"
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/80"
          >
            Comment (optional)
          </label>
          <textarea
            id="rev-comment"
            data-test="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 1500))}
            className="mt-2 w-full rounded-lg border border-input bg-card p-3 text-sm transition-colors focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            rows={4}
            placeholder="What worked, what didn't?"
          />
        </div>

        {evidenceRequired && (
          <div className="mt-5">
            <label
              htmlFor="rev-evidence"
              className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/80"
            >
              Evidence link (required for 1–2★)
            </label>
            <input
              id="rev-evidence"
              data-test="review-evidence"
              type="url"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              className="mt-2 w-full rounded-lg border border-input bg-card p-3 text-sm transition-colors focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="https://example.com/screenshot.png"
            />
          </div>
        )}

        {heldNote && (
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-amber-600 dark:text-amber-400">
            {heldNote}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-foreground"
          >
            Cancel
          </button>
          <button
            disabled={busy || (evidenceRequired && !evidenceUrl)}
            data-test="review-submit"
            onClick={() =>
              onSubmit({
                rating,
                comment,
                evidenceUrl: evidenceUrl || undefined,
              })
            }
            className="inline-flex min-h-11 items-center rounded-lg bg-foreground px-4 py-2 text-sm font-bold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Submit review"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Adapts the live LiveProfile shape to the Provider shape the page renders
// from. Live DB data wins; mock fields fill any unset / blank entries so the
// legacy seeded profiles keep looking sane.
function liveProfileProvider(profile: LiveProfile, mock: Provider | undefined): Provider {
  const skillLabels = profile.skills
    .filter((s) => s.kind === "skill")
    .map((s) => s.label);
  const serviceLabels = profile.skills
    .filter((s) => s.kind === "service")
    .map((s) => s.label);
  const productLabels = profile.skills
    .filter((s) => s.kind === "product")
    .map((s) => s.label);

  return {
    id: profile.id,
    username: profile.username,
    name: profile.name,
    avatar:
      profile.avatar
      || mock?.avatar
      || `https://i.pravatar.cc/200?u=${encodeURIComponent(profile.username)}`,
    accountType: profile.accountType === "Business" ? "Business" : "Individual",
    status: profile.status === "active" ? "active" : "inactive",
    country: profile.country ?? mock?.country ?? "",
    state: profile.state ?? mock?.state ?? "",
    city: profile.city ?? mock?.city ?? "",
    distanceKm: profile.distanceKm ?? mock?.distanceKm ?? 0,
    skills: skillLabels.length ? skillLabels : (mock?.skills ?? []),
    products: productLabels.length ? productLabels : mock?.products,
    services: serviceLabels.length ? serviceLabels : (mock?.services ?? []),
    hourlyRate: profile.hourlyRate ?? mock?.hourlyRate ?? 0,
    currency: profile.currency ?? mock?.currency ?? "USD",
    workHours: profile.workHours ?? mock?.workHours ?? "Not provided",
    remote: profile.remote ?? mock?.remote ?? false,
    bio:
      profile.bio
      || mock?.bio
      || "This member has not completed their public profile details yet.",
    links: profile.links.length
      ? profile.links.map((l) => ({ label: l.label, url: l.url }))
      : (mock?.links ?? []),
    cvUrl: profile.cvUrl ?? mock?.cvUrl ?? "#",
    followers: profile.followers,
    following: profile.following,
    verified: mock?.verified ?? false,
  };
}
