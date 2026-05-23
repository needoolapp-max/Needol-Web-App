# Needool Web App Handoff

This file gives a future AI agent or developer enough context to continue the Needool dummy MVP without rediscovering the project from scratch.

## Project Snapshot

Needool is currently a local dummy web app MVP for a global skills, services, jobs, opportunities, events, referrals, and admin moderation marketplace. It is intentionally built with mock data and local dummy auth so API keys and real integrations can be added later.

The project now has three top-level application folders:

- `frontend`: the public website and logged-in member experience.
- `backend`: local Node HTTP dummy API and persisted JSON data store.
- `admin-panel`: separate admin dashboard SPA.
- `context`: PRDs, logos/assets, and this handoff file.

Important context docs:

- `context/Needool MVP PRD v3 (1).docx`: original PRD/reference supplied by the user.
- `context/current-version-prd/Needool-MVP-Dummy-Site-PRD.md`: current-version PRD created for this dummy MVP.
- `context/icon-nbg.png`: source icon-only Needool logo image supplied by the user.
- `context/logo-nbg.png`: source Needool icon + wordmark image supplied by the user.
- `context/handoff.md`: this file.

The workspace root is:

```text
C:\Users\ufuoma\Desktop\Needol Web App
```

There is currently no `.git` repository in this folder.

## How To Run Locally

Root scripts are in `package.json`.

Run all three services:

```bash
npm run dev
```

Or run them separately:

```bash
npm run dev:frontend
npm run dev:backend
npm run dev:admin
```

Default local ports:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:4100`
- Admin panel: `http://localhost:3200`

Build checks:

```bash
npm --workspace frontend run build
npm --workspace admin-panel run build
```

The backend has no build step; it runs directly with Node:

```bash
npm --prefix backend run dev
```

For Render deployment, the backend also has:

```bash
npm start
```

## Technology Stack

Frontend:

- React 19
- Vite
- TanStack Router / TanStack Start-style file routes
- TanStack Query
- Tailwind CSS v4
- Lucide React icons
- Mock data in `frontend/src/lib/mockData.ts`

Backend:

- Plain Node HTTP server, no Express
- File persistence in `backend/data/store.json` by default
- Optional Supabase-backed JSON state store for the free founder-review deployment
- Optional Resend email hook for signup/demo emails
- Main server file: `backend/server.mjs`

Admin panel:

- React 19
- Vite
- Plain CSS in `admin-panel/src/styles.css`
- Hash-based routing in `admin-panel/src/main.jsx`
- Lucide React icons

## Seed Logins

The backend seeds three main users if `backend/data/store.json` does not exist:

Individual account:

```text
Email: ada@needool.local
Username: ada.codes
Password: password
Referral code: ADA-CODES
Status: active
```

Individual referred account:

```text
Email: kemi@needool.local
Username: kemi.designs
Password: password
Referral code: KEMI-DESIGNS
Status: active
Referred by: ADA-CODES
```

Business account:

```text
Email: fixit@needool.local
Username: fixit.lagos
Password: password
Referral code: FIXIT-LAGOS
Status: active
```

If local data becomes messy during testing, stop the backend, delete `backend/data/store.json`, and restart the backend. It will recreate the seed store.

## Backend API

Main file:

```text
backend/server.mjs
```

Key endpoints:

- `GET /health`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/session?token=...`
- `GET /api/admin/overview`
- `GET /api/admin/users`
- `GET /api/admin/events`
- `GET /api/providers`
- `GET /api/needs`
- `GET /api/opportunities`
- `GET /api/events`
- `GET /api/jobs`
- `POST /api/mock-checkout`

Auth is local only. Tokens are simply user IDs. Passwords are stored as plain text because this is a dummy localhost MVP, not production security.

Signup supports individual and business account types. If a valid referral code is used, the new user is marked active, the referrer receives a referral record and notification, and admin events are updated.

## Frontend Structure

Main app folder:

```text
frontend
```

Important files:

- `frontend/src/routes/__root.tsx`: root shell, query provider, auth provider, dev auth toggle, router outlet.
- `frontend/src/context/AuthContext.tsx`: local auth context, login/signup/session calls to backend.
- `frontend/src/context/ThemeContext.tsx`: logo-derived light/dark theme provider with browser-default behavior.
- `frontend/src/components/nav/TopNav.tsx`: public site navigation.
- `frontend/src/components/nav/Footer.tsx`: expanded standard footer.
- `frontend/src/components/nav/DashboardLayout.tsx`: logged-in dashboard sidebar and mobile sidebar.
- `frontend/src/components/nav/ThemeToggle.tsx`: sun/moon theme toggle used in public and dashboard headers.
- `frontend/src/components/nav/DevAuthToggle.tsx`: draggable dev mode toggle.
- `frontend/src/components/dashboard/MemberDashboardPages.tsx`: main dashboard landing page.
- `frontend/src/components/dashboard/LoggedInAccountPages.tsx`: real logged-in individual and business account pages.
- `frontend/src/styles.css`: global theme, Tailwind setup, responsive overflow guards.
- `frontend/.env.example`: frontend deployment environment template.
- `frontend/vercel.json` and `frontend/public/_redirects`: static hosting rewrites for shared links/direct route refreshes.

Public routes include:

- `/`
- `/search`
- `/needs`
- `/opportunities`
- `/jobs`
- `/events`
- `/pricing`
- `/referrals`
- `/help`
- `/about`
- `/privacy`
- `/terms`
- `/safety`
- `/contact`
- `/cookies`
- `/login`
- `/signup`
- `/p/$username`

Logged-in individual routes:

- `/dashboard`
- `/dashboard/profile`
- `/dashboard/referrals`
- `/dashboard/notifications`
- `/dashboard/needs`
- `/dashboard/opportunities`
- `/dashboard/jobs`
- `/dashboard/events`
- `/dashboard/reviews`
- `/dashboard/help`

Business-only routes:

- `/dashboard/business-profile`
- `/dashboard/services`
- `/dashboard/team`
- `/dashboard/leads`
- `/dashboard/analytics`

### Important Dashboard Routing Note

This was a real bug already fixed.

TanStack treats `/dashboard/profile`, `/dashboard/referrals`, and the other dashboard pages as children of `/dashboard`. Therefore:

- `frontend/src/routes/dashboard.tsx` must be a parent/layout route that renders `<Outlet />`.
- `frontend/src/routes/dashboard.index.tsx` must render the actual dashboard main page.

If someone changes `dashboard.tsx` back to rendering `DashboardHome` directly, every child route will show the main dashboard page even though the URL changes. This is exactly what previously happened.

Current intended route setup:

```tsx
// dashboard.tsx
export const Route = createFileRoute("/dashboard")({
  component: Outlet,
});

// dashboard.index.tsx
export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
});
```

The sidebar currently uses direct `href` links in `DashboardLayout.tsx` for reliable page navigation.

## Admin Panel Structure

Main folder:

```text
admin-panel
```

Important files:

- `admin-panel/src/main.jsx`: full admin app, hash routing, mock page definitions, backend polling.
- `admin-panel/src/styles.css`: admin layout, responsive behavior, collapsed sidebar.
- `admin-panel/.env.example`: admin deployment environment template.
- `admin-panel/vercel.json` and `admin-panel/public/_redirects`: static hosting rewrites.

Admin routes are hash routes:

- `http://localhost:3200/#/dashboard`
- `http://localhost:3200/#/users`
- `http://localhost:3200/#/approvals`
- `http://localhost:3200/#/hire-requests`
- `http://localhost:3200/#/jobs`
- `http://localhost:3200/#/events`
- `http://localhost:3200/#/reviews`
- `http://localhost:3200/#/withdrawals`
- `http://localhost:3200/#/help-cms`
- `http://localhost:3200/#/settings`
- `http://localhost:3200/#/audit-log`

The admin dashboard has a collapsible sidebar and all menu items show real mock pages. It polls backend admin endpoints for registrations, users, and events.

## Free Dev Deployment Prep

The project is prepared for the user's intended free founder-review deployment path:

- Frontend/public site: Vercel or Netlify static deployment.
- Admin panel: separate Vercel or Netlify static deployment.
- Backend: Render free web service.
- Keep-awake monitor: UptimeRobot hitting `/health` every 5 minutes.
- Database/storage prep: Supabase free project.
- Email prep: Resend, optional until real emails are needed.

Deployment files added:

- `render.yaml`: Render blueprint for `backend`.
- `backend/.env.example`: backend env template.
- `frontend/.env.example`: public app env template.
- `admin-panel/.env.example`: admin env template.
- `context/deployment/free-dev-deployment-checklist.md`: manual setup checklist.
- `context/deployment/security-preflight.md`: GitHub/security checklist.
- `context/deployment/supabase-demo-state.sql`: Supabase SQL for the dummy JSON state store and private storage buckets.

Backend environment behavior:

- `DATA_PROVIDER=local`: uses `backend/data/store.json`.
- `DATA_PROVIDER=supabase`: uses Supabase REST with `SUPABASE_SERVICE_ROLE_KEY` to persist one JSON state row in `needool_app_state`.
- `ALLOWED_ORIGINS`: comma-separated CORS allowlist for deployed frontend/admin URLs.
- `ADMIN_API_TOKEN`: optional token gate for `/api/admin/*`.
- `RESEND_API_KEY`: optional Resend send hook. If absent, email calls are skipped.

Security note: `VITE_ADMIN_API_TOKEN` in the admin panel is visible in the browser bundle. It is only a dummy-founder-demo guard, not real admin auth. For anything serious, protect the admin URL with Cloudflare Access, Vercel protection, Netlify protection, or real app auth.

## Branding And Assets

The user supplied two logo images in `context`:

- `context/icon-nbg.png`: icon-only logo. This is used strictly for favicons/app icons.
- `context/logo-nbg.png`: icon + Needool wordmark. This is used wherever the web app displays the brand logo.

Both source images had a lot of empty space around a smaller centered logo. They were processed with `sharp` from the root `node_modules` to crop around the central artwork, remove the extra empty area, and output transparent web-ready assets.

Generated assets:

- `frontend/public/favicon.png`
- `frontend/public/icon-192.png`
- `frontend/public/icon-512.png`
- `frontend/public/brand-logo.png`
- `admin-panel/public/favicon.png`
- `admin-panel/public/icon-192.png`
- `admin-panel/public/icon-512.png`
- `admin-panel/public/brand-logo.png`

Frontend favicon and manifest references are in:

- `frontend/src/routes/__root.tsx`
- `frontend/public/manifest.json`

Admin favicon reference is in:

- `admin-panel/index.html`

Brand logo usage:

- `frontend/src/components/nav/TopNav.tsx`
- `frontend/src/components/nav/Footer.tsx`
- `frontend/src/components/nav/DashboardLayout.tsx`
- `admin-panel/src/main.jsx`
- `admin-panel/src/styles.css`

The old placeholder `frontend/public/icon.svg` was deleted.

## Design Direction

The user asked for the style to be inspired by `stake.com`: dark web-app UI, strong sidebar/nav, compact cards, blue/gold accent energy, icons, dense but polished product surfaces.

The latest design direction is now driven directly by the Needool logo colors. The logo sampling used:

- Deep logo blue around `#035ca1`
- Mid logo cyan around `#00a2c5`
- Bright logo cyan around `#02e3ea`

Current design constraints already reflected:

- Dark theme is a couple of shades darker than the deepest logo blue, with background/surfaces such as `#020d14`, `#061822`, and `#010910`.
- Light theme is a couple of shades lighter than the bright logo cyan, with ice/cyan surfaces such as `#f2fdff`, `#ffffff`, and pale cyan panels.
- Buttons, section borders, focus states, active nav states, and dashboard accents use the sampled logo blues/cyans.
- Rounded corners generally kept around 8px.
- Lucide icons used throughout buttons/navigation.
- Public site has a standard larger footer and legal/company pages.
- Admin has a proper footer and dashboard pages.
- Logged-in member dashboard has real individual pages and business-only pages.

## Light And Dark Mode

Light/dark mode is implemented across the public frontend, logged-in dashboard, and admin panel.

Expected behavior:

1. On first visit, the app follows the browser/computer `prefers-color-scheme`.
2. The user can toggle manually with a visible sun/moon icon button in the header.
3. Once toggled, the selected mode is saved in `localStorage`.
4. The saved user choice persists across refreshes.

Shared storage key:

```text
needool-theme
```

Frontend implementation:

- `frontend/src/context/ThemeContext.tsx`
- `frontend/src/components/nav/ThemeToggle.tsx`
- `frontend/src/routes/__root.tsx`
- `frontend/src/components/nav/TopNav.tsx`
- `frontend/src/components/nav/DashboardLayout.tsx`
- `frontend/src/styles.css`

The frontend theme provider sets:

```text
document.documentElement.dataset.theme
document.documentElement.style.colorScheme
```

Admin implementation:

- `admin-panel/src/main.jsx`
- `admin-panel/src/styles.css`

Admin uses its own `useThemeMode` hook but the same `needool-theme` storage key and the same root `data-theme` approach.

Important note for future edits: keep the public app and admin panel theme variables visually aligned. They are separate CSS files, so changes to the palette may need to be mirrored in both `frontend/src/styles.css` and `admin-panel/src/styles.css`.

If the user reports that the browser default is not being respected, check whether `needool-theme` already exists in localStorage. A saved choice intentionally overrides the system preference.

## Dev Mode Toggle

The frontend has a floating dev auth toggle:

```text
frontend/src/components/nav/DevAuthToggle.tsx
```

It lets the user switch between:

- Visitor
- Inactive
- Active

It is draggable. Its position is stored in `localStorage` under:

```text
needool-dev-toggle-position
```

It was fixed so it no longer starts or drags off-screen on small screens.

## Referral System

Implemented in backend and frontend.

Flow:

1. Existing user has a referral code, e.g. `ADA-CODES`.
2. New signup can enter that referral code.
3. Backend marks new referred account active.
4. Referrer gets a referral record in their account.
5. Referrer receives a notification.
6. Admin events show that a referred user registered.

Relevant files:

- `backend/server.mjs`
- `frontend/src/routes/signup.tsx`
- `frontend/src/context/AuthContext.tsx`
- `frontend/src/components/dashboard/LoggedInAccountPages.tsx`
- `admin-panel/src/main.jsx`

## Responsiveness Work Completed

The app was checked specifically for horizontal screen movement/overflow.

Changes made:

- `frontend/src/styles.css`: global `overflow-x: hidden`, max-width guards for html/body/root/media/table.
- `admin-panel/src/styles.css`: same global guards plus mobile admin layout fixes.
- `frontend/src/components/cards/NeedCard.tsx`: mobile card min-width changed so it cannot force page overflow.
- `frontend/src/components/nav/DevAuthToggle.tsx`: dev toggle constrained to viewport.

Verification performed:

- Frontend build passed.
- Admin build passed.
- A Chrome DevTools Protocol audit checked `220` page/viewport combinations.
- Viewport widths checked: `320`, `375`, `768`, `1024`, `1440`.
- Result: `0` horizontal overflow failures.

## Local Verification Already Done

Successful commands:

```bash
npm --workspace frontend run build
npm --workspace admin-panel run build
```

These build commands were also re-run successfully after the logo asset replacement and after the logo-derived light/dark mode work.

Backend health response:

```json
{
  "ok": true,
  "service": "needool-dummy-backend",
  "apiKeysRequired": false
}
```

Dashboard route verification was done after fixing the `Outlet` bug. The expected live route matching is:

- `/dashboard` -> dashboard index route
- `/dashboard/profile` -> profile page
- `/dashboard/referrals` -> referrals page
- `/dashboard/notifications` -> notifications page
- `/dashboard/needs` -> needs page
- `/dashboard/opportunities` -> opportunities page
- `/dashboard/jobs` -> jobs page
- `/dashboard/events` -> events page
- `/dashboard/reviews` -> reviews page
- `/dashboard/help` -> help page

## Known Caveats

- This is a dummy MVP. Do not treat the auth or backend as production-ready.
- Passwords are plain text.
- Tokens are user IDs.
- The data store is local JSON.
- Admin auth is not implemented; admin panel is open locally.
- API keys are intentionally not required. Where real integrations would be needed, dummy/local behavior is used.
- The route tree file `frontend/src/routeTree.gen.ts` is generated by TanStack/Vite tooling. Do not manually edit it unless absolutely necessary.
- If Vite seems stuck on old route behavior, restart the frontend dev server.
- If backend state seems inconsistent, reset `backend/data/store.json`.

## Useful Commands For Future Agents

Check ports:

```powershell
Get-NetTCPConnection -LocalPort 3000,3200,4100 -State Listen
```

Kill a stuck frontend server:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

Start frontend cleanly:

```powershell
cd "C:\Users\ufuoma\Desktop\Needol Web App\frontend"
npm run dev -- --host 127.0.0.1 --port 3000
```

Start backend:

```powershell
cd "C:\Users\ufuoma\Desktop\Needol Web App\backend"
npm run dev
```

Start admin:

```powershell
cd "C:\Users\ufuoma\Desktop\Needol Web App\admin-panel"
npm run dev
```

Reset local dummy data:

```powershell
Remove-Item -LiteralPath "C:\Users\ufuoma\Desktop\Needol Web App\backend\data\store.json"
```

Then restart the backend.

## Suggested Next Work

The next agent can continue from a stable dummy MVP and start replacing dummy areas with real implementation:

- Add real backend framework or database if required.
- Add secure auth and password hashing.
- Add real admin authentication.
- Connect payments/subscriptions.
- Connect email/SMS/notification provider.
- Replace mock provider/search data with API-backed data.
- Add real moderation workflows.
- Add production deployment setup.
- Add proper automated test suite.

Before making major changes, read:

1. `context/current-version-prd/Needool-MVP-Dummy-Site-PRD.md`
2. `context/handoff.md`
3. `frontend/src/routes`
4. `frontend/src/components/dashboard`
5. `backend/server.mjs`
6. `admin-panel/src/main.jsx`
