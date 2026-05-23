
## Needool Frontend Plan

Frontend-only PWA for a global skills directory. No backend — all data mocked, auth simulated via React context with a dev toggle.

### Stack & Setup
- Existing TanStack Start + React + TS + Tailwind v4 + shadcn/ui (already in project — will use TanStack Router instead of React Router DOM since that's what the template ships with; functionally equivalent for routing)
- Mobile-first, designed at ~380px, scales to desktop
- PWA: add `public/manifest.json` + icons + meta tags in `__root.tsx` (manifest-only, no service worker per Lovable preview constraints)

### Design Tokens (`src/styles.css`)
- `--primary`: oklch equivalent of `#1F3A5F` (deep navy)
- `--accent`: oklch equivalent of `#D49C3D` (warm gold)
- Supporting tokens: success (active badge green), muted (inactive gray), card surfaces
- Rounded-2xl cards, soft shadows, generous spacing
- Font pair: Inter/Plus Jakarta Sans for trustworthy SaaS feel

### Mock Data (`src/lib/mockData.ts`)
- `providers[]`: ~20 entries with avatar, name, username, accountType (Individual/Business/NGO), status (active/inactive), country/state/city, distanceKm, skills[], hourlyRate, workHours, remoteAvailable, bio, links, cvUrl, followers, following
- `needs[]`: ~8 need requests (title, poster, location, budget, posted date)
- `reviews[]`: per-provider, with type tag "Verified Hire" / "Member", rating, body
- `countries[]`: list with flag emoji + ISO code for scope picker

### Fake Auth (`src/context/AuthContext.tsx`)
- State: `'visitor' | 'inactive' | 'active'` + mock user object
- Dev toggle component (fixed top-right) — segmented control to switch states; persists to localStorage
- Hook: `useAuth()` returning state, user, helpers `isLockedFor(feature)`

### Shared Components
- `<TopNav>` (logged-out): logo, center SearchBar with scope dropdown + country flag picker, nav buttons (Needs, Job Openings, Events, Login/Signup)
- `<DashboardSidebar>` (logged-in): Main, Profile, Referrals, Notifications, Needs, Opportunities, Job Openings, Events, Reviews, Help & Guide — collapsible on mobile via shadcn Sheet
- `<Footer>`: social links + Contact
- `<ProviderCard>`: avatar, name, account-type badge, active/inactive pill, location, skill chips, distance
- `<NeedCard>`: compact horizontal card
- `<SearchBar>`: scope selector (Worldwide/Country/State/City/Near me) + flag picker + query input
- `<LockedField>`: blurred placeholder with lock icon + tooltip "Available to active members"
- `<Skeleton>` loaders + `<EmptyState>` component
- `<DevAuthToggle>`: top-right floating segmented switch

### Routes (TanStack file-based)
1. **`/` — Home (public)**: `<TopNav>`, hero with large SearchBar, "Top Providers" grid of `<ProviderCard>`, "Recent Needs" row of `<NeedCard>`, `<Footer>`
2. **`/search` — Search results**: `<TopNav>`, two-column layout: left filter sidebar (scope, account type, remote toggle, skill chips), right results. Active providers grouped above an "Inactive providers" subheader. Inactive cards swap contact CTA for "Notify when active" button
3. **`/p/$username` — Public profile**: avatar header, name/username, badges (account type + active status), location + distance, bio, hourly rate, work hours, remote toggle indicator, skill/product/service tag groups, links (locked for visitor/inactive), view-only CV embed placeholder (no download button), Follow button, follower/following counts, Reviews section with star aggregate + review cards tagged "Verified Hire" or "Member", sticky Contact/Hire CTA, disclaimer banner at bottom. Contact info + links + CV gated by `<LockedField>` for visitor/inactive
4. **`/dashboard` — Main (logged-in)**: `<DashboardSidebar>` layout, skills-only `<SearchBar>` (no scope), provider results grid below. Redirects to `/` if visitor (or shows empty state with login prompt depending on toggle)

### Gated/Empty/Loading States
- Each route renders skeleton cards for ~600ms simulated load
- Empty state component with illustration placeholder + message + CTA
- Inactive-user view across profile/dashboard shows lock overlays on protected fields

### File Structure
```
src/
  routes/
    __root.tsx          (add manifest link, DevAuthToggle, AuthProvider)
    index.tsx           (Home)
    search.tsx
    p.$username.tsx     (Public profile)
    dashboard.tsx
  components/
    nav/TopNav.tsx
    nav/DashboardSidebar.tsx
    nav/Footer.tsx
    nav/DevAuthToggle.tsx
    search/SearchBar.tsx
    search/FilterSidebar.tsx
    cards/ProviderCard.tsx
    cards/NeedCard.tsx
    cards/ReviewCard.tsx
    common/LockedField.tsx
    common/EmptyState.tsx
    common/ProviderCardSkeleton.tsx
  context/AuthContext.tsx
  lib/mockData.ts
public/
  manifest.json
  icon-192.png / icon-512.png (generated)
```

### Out of Scope (this pass)
- Needs / Job Openings / Events / Notifications / Referrals / Reviews / Help routes (sidebar links will exist but route to a simple "Coming soon" placeholder so nav doesn't 404)
- Real auth, real search, real geolocation
- Service worker / offline mode
