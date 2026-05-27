# Needool Web App — Engineering Handoff

**Last updated:** 27 May 2026  
**Session author:** Claude Sonnet 4.6 (Anthropic)  
**Stack:** React 19 · TanStack Router (SSR) · TanStack Start · Vite 7 · Tailwind CSS v4 · Clerk v5 · Node.js backend · Supabase · Render (backend) · Vercel (frontend)

---

## Table of Contents

1. [App Architecture](#1-app-architecture)
2. [Deployment & Infrastructure](#2-deployment--infrastructure)
3. [Environment Variables](#3-environment-variables)
4. [Auth Flow — How It Works End-to-End](#4-auth-flow--how-it-works-end-to-end)
5. [What Was Achieved This Session](#5-what-was-achieved-this-session)
6. [Every Error Encountered & How It Was Fixed](#6-every-error-encountered--how-it-was-fixed)
7. [Recurring Errors (Kept Coming Back)](#7-recurring-errors-kept-coming-back)
8. [Outstanding Issues](#8-outstanding-issues)
9. [Improvements & Recommendations](#9-improvements--recommendations)
10. [Critical Security Rules](#10-critical-security-rules)

---

## 1. App Architecture

### Monorepo Layout

```
Needol Web App/
├── frontend/          → User-facing app (Vercel, port 3000 local)
├── backend/           → API server (Render free tier, port 4100 local)
├── admin-panel/       → Admin dashboard (port 3200 local)
├── render.yaml        → Render deployment config
└── package.json       → Workspace root
```

### Frontend — `frontend/`

**Framework:** React 19 + TanStack Router (file-based routing) + TanStack Start (SSR)  
**Styling:** Tailwind CSS v4 with CSS custom properties (design tokens in `styles.css`)  
**Auth SDK:** `@clerk/clerk-react` v5

**Route files** (`frontend/src/routes/`):
```
__root.tsx              → Root shell: ClerkProvider, ThemeProvider, AuthProvider
index.tsx               → Landing page (/)
login.tsx               → /login  — split-panel, email+password, Google OAuth, forgot password
signup.tsx              → /signup — split-panel, email+OTP, Google OAuth, referral code
sso-callback.tsx        → /sso-callback — handles OAuth return from Google
dashboard.tsx           → /dashboard layout (just an Outlet, no auth gate here)
dashboard.index.tsx     → /dashboard/ — main dashboard home
dashboard.profile.tsx   → /dashboard/profile
dashboard.referrals.tsx → /dashboard/referrals
dashboard.notifications.tsx
dashboard.needs.tsx
dashboard.opportunities.tsx
dashboard.jobs.tsx
dashboard.events.tsx
dashboard.reviews.tsx
dashboard.help.tsx
dashboard.business-profile.tsx  → Business accounts only
dashboard.services.tsx
dashboard.team.tsx
dashboard.leads.tsx
dashboard.analytics.tsx
p.$username.tsx         → /p/:username — public provider profile
search.tsx              → /search
pricing.tsx, about.tsx, contact.tsx, help.tsx, events.tsx, jobs.tsx, needs.tsx, opportunities.tsx, referrals.tsx
terms.tsx, privacy.tsx, safety.tsx, cookies.tsx
```

**Key components** (`frontend/src/components/`):
```
nav/DashboardLayout.tsx      → THE auth gate — handles all states:
                               loading spinner → backend error → onboarding form → visitor gate → full dashboard
nav/ThemeToggle.tsx          → Light/dark toggle
dashboard/MemberDashboardPages.tsx  → DashboardHome + DashboardSection
cards/ProviderCard.tsx       → Provider listing card
search/SearchBar.tsx
ui/spotlight-card.tsx (GlowCard)
common/EmptyState.tsx, ProviderCardSkeleton.tsx
```

**Key context files** (`frontend/src/context/`):
```
AuthContext.tsx   → Wraps Clerk + backend sync into a single auth state
ThemeContext.tsx  → Light/dark theme
```

### Backend — `backend/server.mjs`

Single-file Node.js HTTP server (no Express). Key endpoints:

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /health` | None | Status check — shows what is/isn't configured |
| `GET /api/auth/sync` | Frontend Clerk JWT | Check if user exists in backend; returns `{ user }` or `{ needsOnboarding: true }` |
| `POST /api/auth/register` | Frontend Clerk JWT | Create user record in backend after onboarding form |
| Admin endpoints | Admin Clerk JWT | CRUD for users, providers, data |

**Data layer:** Supabase (production) or local JSON file (`backend/data/store.json`, for local dev)

**Token verification:** The backend has TWO separate verification functions:
- `requireFrontendUser(req, res)` — verifies using `CLERK_FRONTEND_SECRET_KEY` (frontend Clerk app)
- `requireAdmin(req, res)` — verifies using `CLERK_SECRET_KEY` (admin Clerk app)

These must NEVER be swapped. Wrong key = 401 on every call.

---

## 2. Deployment & Infrastructure

| Service | Platform | URL | Notes |
|---|---|---|---|
| Frontend | Vercel | `https://dev.needool.com` | Auto-deploys on push to `main` |
| Backend | Render (free tier) | `https://needol-web-app.onrender.com` | Spins down after 15 min idle — cold start takes ~30–50s |
| Database | Supabase | — | `DATA_PROVIDER=supabase` in Render env vars |
| Auth (frontend users) | Clerk | `clerk.needool.com` | Frontend Clerk app — separate from admin |
| Auth (admin) | Clerk | — | Admin Clerk app — separate from frontend |
| Emails | Resend | — | `RESEND_API_KEY` in Render |

**Render free tier cold start:** The backend goes to sleep after 15 minutes of no traffic. The first request after sleep takes 30–50 seconds. The frontend shows "Server is starting up, please wait…" after 6 seconds of loading and waits up to 50 seconds before timing out.

---

## 3. Environment Variables

### Frontend (Vercel)

| Variable | Value | Notes |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_test_...` or `pk_live_...` | From the **frontend** Clerk app (NOT admin) |
| `VITE_API_BASE_URL` | `https://needol-web-app.onrender.com` | Backend URL |

### Backend (Render)

| Variable | Notes |
|---|---|
| `CLERK_FRONTEND_SECRET_KEY` | Secret Key from the **same** frontend Clerk app as `VITE_CLERK_PUBLISHABLE_KEY` |
| `CLERK_SECRET_KEY` | Secret Key from the **admin** Clerk app — NEVER mix with frontend |
| `ADMIN_ALLOWED_EMAILS` | Comma-separated emails allowed admin access |
| `DATA_PROVIDER` | `supabase` in production |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `SUPABASE_STATE_TABLE` | `needool_app_state` |
| `SUPABASE_STATE_KEY` | `dummy_store` |
| `ALLOWED_ORIGINS` | `https://dev.needool.com,https://needool.com` |
| `RESEND_API_KEY` | Resend email API key |
| `RESEND_FROM_EMAIL` | `Needool <hello@needool.com>` |

**CRITICAL:** `CLERK_FRONTEND_SECRET_KEY` and `VITE_CLERK_PUBLISHABLE_KEY` must be from the same Clerk application. Mismatch causes 401 on every authenticated API call.

**render.yaml note:** `CLERK_FRONTEND_SECRET_KEY` is NOT listed in `render.yaml` (it uses `sync: false` for secrets). You must set it manually in the Render dashboard.

---

## 4. Auth Flow — How It Works End-to-End

### Email Signup

```
1. User fills name/email/password on /signup
2. signUp.create() → Clerk creates account
3. signUp.prepareEmailAddressVerification() → Clerk sends OTP email
4. User enters 6-digit code → signUp.attemptEmailAddressVerification()
5. setActive({ session }) → Session created
6. navigate("/dashboard")
7. AuthContext useEffect fires → apiFetch("/api/auth/sync")
8. Backend: clerkId not in DB → returns { needsOnboarding: true }
9. DashboardLayout shows onboarding form
10. User fills username, account type, optional referral code
11. registerProfile() → POST /api/auth/register
12. Backend creates user record, returns { user }
13. DashboardLayout shows full dashboard
```

### Google OAuth Signup

```
1. User clicks "Sign up with Google" on /signup
2. signUp.authenticateWithRedirect({ strategy: "oauth_google", redirectUrl: "/sso-callback" })
3. Browser redirects to Google
4. Google authenticates → redirects to clerk.needool.com/v1/oauth_callback
5. Clerk processes OAuth → redirects to /sso-callback
6. <AuthenticateWithRedirectCallback afterSignUpUrl="/dashboard" />
7. navigate("/dashboard") — then same as steps 7-13 above
```

### Auth State Machine (AuthContext)

```
DashboardLayout renders in this priority order:
  1. loading = true          → spinner (Clerk init OR backend sync in progress)
  2. backendError = true     → "Connection problem" screen + retry button
  3. needsOnboarding = true  → onboarding form (username, account type, referral)
  4. state === "visitor"     → sign-in/sign-up prompt
  5. state === "inactive"    → dashboard with InactiveBanner
  6. state === "active"      → full dashboard
```

### Clerk Dashboard Settings Required

| Setting | Value |
|---|---|
| Sign-in URL | `/login` |
| Sign-up URL | `/signup` |
| After sign-out URL | `/` |
| Username field | **Optional** (NOT required — required username blocks Google OAuth) |
| Bot protection (Turnstile) | **OFF** for development on custom domain |

---

## 5. What Was Achieved This Session

### ✅ Complete Login & Signup Page Redesign
- Replaced basic forms with a production-grade split-panel layout
- Left panel: brand gradient (`#0277b4 → #01587f → #0d1b2a`), logo, feature list, decorative orbs and grid overlay
- Right panel: clean form — email+password, Google OAuth button, divider, terms footer
- Signup: 2-step flow (form → OTP verification), collapsible referral code, `?ref=` query param support
- Login: inline 3-state forgot-password flow (`idle → entry → sent`) — no page change needed
- Removed `TopNav` and `Footer` from auth pages — auth pages are now full-viewport standalone

### ✅ Fixed Auth Redirect Loop
- Added `signInUrl`, `signUpUrl`, `afterSignOutUrl`, `signInForceRedirectUrl`, `signUpForceRedirectUrl` to `ClerkProvider` in `__root.tsx`
- Users were previously bouncing between login/signup after auth

### ✅ Fixed React Hooks Ordering Violation
- `login.tsx` had `useState` calls after a conditional early return — React rules violation that caused crashes
- All state declarations moved before any conditional returns

### ✅ Removed Google One Tap (FedCM)
- `<GoogleOneTap />` was causing FedCM browser API errors in the console
- Removed it entirely — Google sign-in works through the "Continue with Google" button flow instead

### ✅ Fixed Google OAuth 401 (Missing JS Origins)
- Added required `Authorized JavaScript Origins` in Google Cloud Console:
  - `https://clerk.needool.com`, `https://dev.needool.com`, `https://needool.com`, `https://www.needool.com`
- Without these, Google rejects the OAuth flow with 401 `invalid_client`

### ✅ Fixed Cloudflare Turnstile Blocking All Signups
- Root cause: Clerk's bot protection (Turnstile) couldn't complete its CAPTCHA challenge on `dev.needool.com` — the Cloudflare iframe's cross-origin `postMessage` was blocked by the browser, triggering a PAT fallback that also failed (401), resulting in error 600010 timeout
- Fix: Disabled bot protection in Clerk Dashboard → Attack Protection → Bot sign-up protection → OFF
- All `clerk-captcha` divs that were added as attempted workarounds were removed

### ✅ Fixed `signup?ref=#/continue` Loop After Google OAuth
- Root cause: Clerk's Username field was set to "Required" — Google OAuth can't provide a username, so Clerk redirected back to `/signup#/continue`
- Fix (code): Added `useEffect` in `signup.tsx` that detects `signUp.status === "missing_requirements"` and calls `signUp.update({})` to complete the pending signup automatically
- Fix (dashboard): Clerk Dashboard → Username → set to **Optional**

### ✅ Fixed Frozen Onboarding Form (DashboardLayout Instability)
- Root cause: `DashboardHome` and `DashboardSection` checked `state === "visitor"` before rendering `DashboardLayout`. During loading AND onboarding, `state` is always `"visitor"` (because `needoolUser = null`). This created two different component tree paths:
  - Path A: `DashboardHome → VisitorGate → DashboardLayout` (state = "visitor")
  - Path B: `DashboardHome → DashboardLayout` (state ≠ "visitor")
- Any re-render (Clerk background session refresh) that momentarily switched paths would unmount `DashboardLayout`, resetting all local form state (`onboardForm`) to empty — inputs appeared completely unresponsive
- Fix: Moved all auth gate logic inside `DashboardLayout` itself. `DashboardHome` and `DashboardSection` now always render `<DashboardLayout>` as a stable wrapper. `VisitorGate` component deleted.

### ✅ Fixed 401 Being Misrouted to Onboarding
- Root cause: When `/api/auth/sync` returned 401 (from CLERK_FRONTEND_SECRET_KEY mismatch), the AuthContext catch block treated it as a "new user" signal and set `needsOnboarding = true` — because 401 errors are not network errors and the code only checked for those
- Fix: `apiFetch` now throws a typed `ApiError` class with the HTTP status. The sync catch block explicitly checks `status === 401 || status === 403 || status >= 500` → shows `backendError` screen with retry button instead of the onboarding form

### ✅ AuthContext Stability (Previous Sessions)
- `useRef` pattern for `getToken` and `signOut` — prevents re-render cascade from Clerk's unstable function references
- `useMemo` on context value — prevents all consumers re-rendering when unrelated state changes
- Stable primitive extraction from `clerkUser` (`clerkId`, `clerkName`, `clerkEmail`, `clerkAvatar`) to prevent unnecessary sync effect re-runs
- 50s fetch timeout via `AbortController`

### ✅ Backend Hardening (Previous Sessions)
- Rate limiting on `/api/auth/register` (6 requests per minute per IP)
- Input validation and sanitization (name, email, username, avatar URL)
- Username auto-generation from email prefix with uniqueness suffix
- `profileComplete` boolean — true only if user explicitly set a username
- Deprecated old auth endpoints return 410

---

## 6. Every Error Encountered & How It Was Fixed

### Error 1: Blank / White Screen After Login
**Symptom:** User logs in, redirects to `/dashboard`, sees blank screen  
**Root cause:** `ClerkProvider` was missing `signInUrl`, `signUpUrl`, `signInForceRedirectUrl` props — Clerk didn't know where to send users  
**Fix:** Added all redirect props to `ClerkProvider` in `__root.tsx`

### Error 2: React Hooks Order Crash
**Symptom:** Login page crashed with "Rules of Hooks" error  
**Root cause:** `useState` declarations appeared after a conditional `if (!userLoaded) return <Spinner />` — React hooks must always be called in the same order, before any returns  
**Fix:** Moved all 7 `useState` declarations to the top of `LoginPage()`, before any early returns

### Error 3: FedCM / GSI_LOGGER Console Errors
**Symptom:** Console flooded with FedCM warnings, Google One Tap not working  
**Root cause:** `<GoogleOneTap />` uses the Federated Credential Management browser API which had compatibility issues  
**Fix:** Removed `<GoogleOneTap />` entirely from `__root.tsx`

### Error 4: Google OAuth 401 `invalid_client`
**Symptom:** Clicking "Sign up with Google" showed "Access blocked: Authorization Error / no registered origin"  
**Root cause:** Google Cloud Console OAuth client didn't have `dev.needool.com` or `clerk.needool.com` in Authorized JavaScript Origins  
**Fix:** Added all four origins to Google Cloud Console → OAuth 2.0 client → Authorized JavaScript Origins

### Error 5: Cloudflare Turnstile Error 600010 (CAPTCHA Timeout)
**Symptom:** Clicking "Sign up with Google" did nothing — no redirect, no error shown, console showed Turnstile PAT 401 errors  
**Root cause (cascade):**
  1. Clerk initialises Turnstile before any OAuth call
  2. Turnstile iframe (`challenges.cloudflare.com`) tries `postMessage` back — blocked cross-origin
  3. PAT fallback also fails (401 — browser privacy settings)
  4. Turnstile times out with error 600010
  5. Clerk waits for CAPTCHA token that never arrives — OAuth redirect never fires  
**Attempted workarounds that didn't work:** Adding `<div id="clerk-captcha" />` in various positions in the component tree  
**Real fix:** Clerk Dashboard → Attack Protection → Bot sign-up protection → **OFF**

### Error 6: `signup?ref=#/continue` Loop After Google OAuth
**Symptom:** After completing Google auth, browser landed on `dev.needool.com/signup?ref=#/continue` instead of dashboard  
**Root cause:** Clerk's Username field was marked "Required". Google OAuth doesn't provide a username, so Clerk couldn't complete the signup and redirected back to the signUpUrl with `#/continue`  
**Fix (code):** Added `useEffect` in `signup.tsx` to detect `signUp.status === "missing_requirements"` and call `signUp.update({})` to auto-complete the pending signup  
**Fix (dashboard):** Clerk Dashboard → User & Authentication → Email, Phone, Username → Username → **Optional**

### Error 7: Frozen / Unresponsive Onboarding Form
**Symptom:** "Complete your profile" form rendered but clicking inputs did nothing, typing was impossible  
**Root cause:** Two component tree paths existed in `DashboardHome`:
  - Path A (state="visitor"): `DashboardHome → VisitorGate → DashboardLayout`
  - Path B (state≠"visitor"): `DashboardHome → DashboardLayout`
  During onboarding, `state = "visitor"` (needoolUser is null). Any re-render (Clerk background token refresh) that briefly evaluated Path B would unmount the `DashboardLayout` instance from Path A, resetting `onboardForm` local state to `""`. This happened faster than the user could type.  
**Fix:** Removed visitor check from `DashboardHome` and `DashboardSection`. Deleted `VisitorGate`. All auth gates consolidated inside `DashboardLayout` in a single, stable chain.

### Error 8: 401 on `/api/auth/register` Showing Onboarding Form
**Symptom:** Console showed `401` from `/api/auth/register`; user could see the onboarding form but submitting did nothing  
**Root cause (code):** When `/api/auth/sync` returned 401 (due to `CLERK_FRONTEND_SECRET_KEY` mismatch), the AuthContext catch block ran `setNeedsOnboarding(true)` — it only checked for network/timeout errors, not HTTP status codes. So a backend misconfiguration silently showed the onboarding form.  
**Root cause (env):** `CLERK_FRONTEND_SECRET_KEY` on Render was either incorrect or set to the admin app's Secret Key instead of the frontend app's  
**Fix (code):** `apiFetch` now throws `ApiError` with HTTP status attached. Catch block treats `401/403/5xx` as `backendError` → shows "Connection problem" with retry  
**Fix (env — user action required):** Set `CLERK_FRONTEND_SECRET_KEY` on Render to the Secret Key from the **same** Clerk app as `VITE_CLERK_PUBLISHABLE_KEY`

### Error 9: Android IME Freeze on Form Inputs (Earlier Sessions)
**Symptom:** On Android devices, typing in form inputs froze the keyboard  
**Root cause:** Value transforms (`.trim()`, `.toLowerCase()`, `.replace()`) were being run inside `onChange` handlers — on Android, the IME (soft keyboard) expects the input value to change predictably on each keystroke, and transforms caused desync  
**Fix:** Moved all transforms out of `onChange` — store the raw value, clean it only at submit time

### Error 10: Re-render Cascade from AuthContext
**Symptom:** Dashboard components re-rendered excessively, causing performance issues and form state loss  
**Root cause:** Clerk's `getToken` and `signOut` functions have unstable references — they change on every background session refresh. These were in `useCallback` dependency arrays, causing the callbacks to recreate on every Clerk update, which cascaded into context value changes.  
**Fix:** `useRef` pattern — store the latest function in a ref, read from the ref inside callbacks. The ref never changes reference, so deps arrays are stable.

---

## 7. Recurring Errors (Kept Coming Back)

### 🔁 Screen Freezes / Unresponsive UI

This recurred in three different forms across multiple sessions:

1. **Post-login freeze** (fixed) — Dashboard showed blank/frozen after login; fixed with timeout + error screen
2. **Android IME freeze** (fixed) — Input fields froze on mobile; fixed by moving transforms out of onChange
3. **Onboarding form freeze** (fixed this session) — Form inputs unresponsive; fixed by stabilising DashboardLayout instance
4. **Form focus / autoFocus conflicts** (fixed earlier) — autoFocus on inputs inside conditional renders caused keyboard conflicts

**Pattern:** Every freeze was a React component tree instability — either too many re-renders, wrong hook ordering, or component unmount/remount during user interaction.

### 🔁 401 Errors on API Calls

This recurred because of the dual Clerk app setup:
- Any time a secret key was wrong or rotated, all API calls returned 401
- The frontend had no way to distinguish a 401 from "new user" vs "misconfigured backend"
- Fixed this session with typed `ApiError` and explicit status code handling

### 🔁 Clerk OAuth Not Redirecting

This recurred in different forms:
- Turnstile blocking the redirect (fixed with bot protection off)
- Missing JavaScript origins in Google Cloud Console (fixed)
- `#/continue` loop from missing username (fixed)
- `redirectUrlComplete` vs `afterSignUpUrl` confusion (resolved — both kept for type safety)

**Pattern:** Clerk OAuth has many failure points, most of which show no visible error to the user — the button just stops responding or the redirect doesn't happen.

---

## 8. Outstanding Issues

### ⚠️ Action Required: Fix `CLERK_FRONTEND_SECRET_KEY` on Render

The 401 errors on `/api/auth/register` are caused by a key mismatch. You must:
1. Clerk Dashboard → switch to the **frontend/user-facing app**
2. API Keys → copy Secret Key (`sk_test_...` or `sk_live_...`)
3. Render → `needool-backend` service → Environment → set `CLERK_FRONTEND_SECRET_KEY`
4. Save → Redeploy

Verify: visit `https://needol-web-app.onrender.com/health` — `frontendAuthConfigured` should be `true`

### ⚠️ `render.yaml` Missing `CLERK_FRONTEND_SECRET_KEY`

The `render.yaml` file in the repo does not declare `CLERK_FRONTEND_SECRET_KEY` as a sync variable. If the service is ever recreated from the yaml, that env var won't be set. Add it:

```yaml
- key: CLERK_FRONTEND_SECRET_KEY
  sync: false
```

### ⚠️ Username Optional — Confirm in Clerk Dashboard

Clerk Dashboard → User & Authentication → Email, Phone, Username → Username must be **Optional** (not Required). If it's Required, Google OAuth signup will loop back to `/signup#/continue`.

### ⚠️ Google OAuth Client Secret Was Exposed

During this session the Google OAuth Client Secret was accidentally shared in chat. It should be rotated:
- Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs → your client → Edit → Regenerate Secret

### ⚠️ Pre-existing TypeScript Errors (Not Introduced This Session)

Two type errors existed before this session and were not fixed:
- `DevAuthToggle.tsx` — `Property 'setState' does not exist on type 'AuthContextValue'`
- `sso-callback.tsx` — `"/sso-callback"` not in `FileRoutesByPath` (TanStack Router type generation gap)

Both are non-blocking at runtime.

---

## 9. Improvements & Recommendations

### High Priority

**1. Add Route-Level Auth Guards**  
Currently, unauthenticated users who navigate directly to `/dashboard/*` URLs get served the full page JS bundle, then see the visitor gate inside DashboardLayout. Better: add a `beforeLoad` hook on the dashboard parent route that redirects to `/login` before rendering anything.

```tsx
// dashboard.tsx
export const Route = createFileRoute("/dashboard")({
  beforeLoad: ({ context }) => {
    if (!context.isSignedIn) throw redirect({ to: "/login" });
  },
  component: Outlet,
});
```

**2. Replace Single JSON Data Store With Proper Supabase Tables**  
The current Supabase implementation stores all data as a single JSON blob in a `needool_app_state` table (`SUPABASE_STATE_KEY = "dummy_store"`). This doesn't scale and has no row-level security, concurrent write safety, or indexing. Proper tables: `users`, `providers`, `referrals`, `notifications`.

**3. Re-enable Bot Protection for Production**  
Turnstile was disabled because `dev.needool.com` isn't registered with Clerk's Turnstile site key. For production (`needool.com`), contact Clerk support to register the domain and re-enable bot protection.

**4. Reduce Backend Timeout or Add Progressive Feedback**  
The 50-second fetch timeout means users wait up to 50 seconds on a cold start with no progress indication beyond "Server is starting up." Consider:
- Render paid plan (no cold starts)
- Or implement polling with exponential backoff instead of a single 50s request

**5. Rotate Backend Architecture Off Single-File Server**  
`backend/server.mjs` is ~600+ lines in a single file with hand-rolled routing. As features grow, this becomes unmaintainable. Consider migrating to Express/Fastify/Hono with separate route modules.

### Medium Priority

**6. Add Real Email Verification Status to Dashboard**  
Backend's `publicUser()` function doesn't expose `emailVerified`. The dashboard can't show whether the user's email is confirmed. Relevant for trust/safety features.

**7. Add Proper Error Boundaries**  
The current `ErrorComponent` in `__root.tsx` catches route-level errors but individual dashboard sections have no error boundaries. A single section crash currently propagates to the whole dashboard.

**8. Terms & Privacy Pages Are Placeholder Links**  
Login, signup, and other pages link to `/` for Terms and Privacy Policy. These need real content pages.

**9. Account Activation Flow Is Incomplete**  
`InactiveBanner` has an "Activate" button that doesn't do anything yet. `state === "inactive"` accounts exist in the data model but there's no flow to activate them.

**10. Business Account Sidebar Is Always Shown When accountType = "Business"**  
The sidebar shows business menu items based purely on `user.accountType`. There's no gating by subscription tier or admin approval. Any user who sets `accountType: "Business"` at onboarding gets the full business menu.

### Low Priority

**11. Add `loading` Skeleton to DashboardSection Pages**  
`DashboardSection` renders immediately with mock `cards` data. When real data is loaded from the backend in the future, there's no loading skeleton pattern in place.

**12. Referral Code Is Stored in `sessionStorage`**  
The referral code from signup's `?ref=` param is stored in `sessionStorage("ndl_ref")` and picked up by `DashboardLayout` onboarding. This survives browser refresh but not a different browser tab or device. For a more robust flow, the referral code should travel through the JWT claims or be stored server-side immediately after signup.

**13. Mock Data in Production**  
`frontend/src/lib/mockData.ts` supplies provider cards and needs that appear on the dashboard. These are static dummy records. Real data will need to be fetched from the backend and the `DashboardHome` query pattern updated.

---

## 10. Critical Security Rules

These rules must be maintained across all future development:

| Rule | Reason |
|---|---|
| Never commit `.env` files | Secret exposure in git history |
| `CLERK_SECRET_KEY` (admin) stays on Render only | If exposed, admin APIs are open |
| `CLERK_FRONTEND_SECRET_KEY` stays on Render only | Token forgery risk |
| `SUPABASE_SERVICE_ROLE_KEY` stays on Render only | Bypasses all Supabase RLS |
| `RESEND_API_KEY` stays on Render only | Anyone could send email as Needool |
| Admin and frontend Clerk apps must stay separate | If merged, end users could access admin APIs |
| Never put secret keys in `VITE_*` env vars | VITE variables are bundled into the browser JS |
| Rotate the Google OAuth Client Secret | It was visible in chat during this session |

---

## Commit History (This Session)

```
2b3781e Fix 401 on sync misrouting to onboarding instead of error screen
586eef5 Fix frozen onboarding form: stabilise DashboardLayout instance
f2ca00c Handle Clerk OAuth #/continue continuation in signup page
567f4cb Remove clerk-captcha div; surface OAuth errors above Google button
0d00d9e Move clerk-captcha outside conditional renders so Clerk finds it on OAuth
77b1d4f Add clerk-captcha element for Turnstile bot protection in custom signup
80d7a38 Remove GoogleOneTap — FedCM not yet supported by Clerk
e3d0805 Configure Clerk sign-in/sign-up/sign-out paths in ClerkProvider
669eb62 Fix auth redirect loop; redesign login and signup pages
8157990 Fix freeze root cause: ref-based Clerk functions, memo VisitorGate
a8ba0b2 Stop re-render cascade: memoize AuthContext value and DashboardLayout
dfaded2 Fix Android IME freeze: move value transforms out of onChange handlers
5f59d59 Make onboarding skippable with defaults; fix form focus; add profile reminder
169bac4 Extend backend timeout to 50s and add warmup message for cold starts
df6fb69 Fix post-login freeze: add 12s timeout, backend error screen with retry
```
