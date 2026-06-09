// PRD §4.4 — SEO helpers. schema.org JSON-LD + canonical URLs + per-page
// OG / Twitter cards. The site URL is derived from VITE_PUBLIC_SITE_URL when
// set; falls back to localhost for dev and the production canonical otherwise.

export const SITE_URL = (
  (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)
  || "https://needool.com"
).replace(/\/$/, "");

// PRD §4.4 — default OG asset. Static file served from /public.
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.svg`;

export function canonical(path: string): string {
  if (path.startsWith("http")) return path;
  if (!path.startsWith("/")) path = `/${path}`;
  return `${SITE_URL}${path}`;
}

export type ProfileSeoInput = {
  username: string;
  name: string;
  accountType: "Individual" | "Business";
  bio?: string | null;
  avatar?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
};

// PRD §4.4 — Person for Individual, LocalBusiness for Business.
export function profileJsonLd(p: ProfileSeoInput): string {
  const isBiz = p.accountType === "Business";
  const obj: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": isBiz ? "LocalBusiness" : "Person",
    name: p.name,
    url: canonical(`/p/${p.username}`),
    identifier: `@${p.username}`,
  };
  if (p.bio) obj.description = p.bio;
  if (p.avatar) obj.image = p.avatar;
  if (p.country || p.state || p.city) {
    obj.address = {
      "@type": "PostalAddress",
      addressCountry: p.country || undefined,
      addressRegion: p.state || undefined,
      addressLocality: p.city || undefined,
    };
  }
  return JSON.stringify(obj);
}

export type PostSeoInput = {
  id: string;
  kind: "need" | "opportunity" | "event";
  title: string;
  description?: string;
  thumbnail?: string | null;
  createdAt?: string;
  scopeCountry?: string | null;
  scopeState?: string | null;
  scopeCity?: string | null;
  authorName?: string;
  payload?: Record<string, unknown>;
};

export function postJsonLd(p: PostSeoInput): string {
  const baseUrl = canonical(`/posts/${p.id}`);
  if (p.kind === "event") {
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Event",
      name: p.title,
      description: p.description || undefined,
      image: p.thumbnail || undefined,
      url: baseUrl,
      startDate: typeof p.payload?.datetime === "string" ? p.payload.datetime : undefined,
      eventAttendanceMode: p.payload?.event_type === "Online"
        ? "https://schema.org/OnlineEventAttendanceMode"
        : "https://schema.org/OfflineEventAttendanceMode",
      location: p.scopeCity || p.scopeCountry
        ? {
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              addressCountry: p.scopeCountry || undefined,
              addressRegion: p.scopeState || undefined,
              addressLocality: p.scopeCity || undefined,
            },
          }
        : undefined,
    });
  }
  // Need + Opportunity → CreativeWork. Authoritative schema.org doesn't
  // have a stronger type for either.
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    headline: p.title,
    description: p.description || undefined,
    image: p.thumbnail || undefined,
    url: baseUrl,
    datePublished: p.createdAt || undefined,
    author: p.authorName ? { "@type": "Person", name: p.authorName } : undefined,
  });
}

export type JobSeoInput = {
  id: string;
  title: string;
  description?: string;
  employmentType?: string;
  publishedAt?: string;
  eligibleLocations?: string[];
};

export function jobJsonLd(j: JobSeoInput): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: j.title,
    description: j.description || undefined,
    employmentType: j.employmentType
      ? j.employmentType.toUpperCase().replace(/[-\s]/g, "_")
      : undefined,
    datePosted: j.publishedAt || undefined,
    url: canonical(`/jobs/${j.id}`),
    hiringOrganization: { "@type": "Organization", name: "Needool" },
    jobLocation: (j.eligibleLocations || []).slice(0, 5).map((loc) => ({
      "@type": "Place",
      address: { "@type": "PostalAddress", addressLocality: loc },
    })),
  });
}

// OpenGraph + Twitter card meta. Returns TanStack head `meta:` entries.
export type OgInput = {
  title: string;
  description?: string;
  url: string;
  image?: string;
  type?: "website" | "profile" | "article";
};
export function openGraphMeta(og: OgInput) {
  const arr: Array<{ name?: string; property?: string; content: string }> = [
    { property: "og:title", content: og.title },
    { property: "og:url", content: og.url },
    { property: "og:type", content: og.type || "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: og.title },
  ];
  if (og.description) {
    arr.push({ property: "og:description", content: og.description });
    arr.push({ name: "twitter:description", content: og.description });
  }
  const image = og.image || DEFAULT_OG_IMAGE;
  arr.push({ property: "og:image", content: image });
  arr.push({ name: "twitter:image", content: image });
  return arr;
}
