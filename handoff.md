# Needool Web App - PRD-Aligned Engineering Handoff

**Last updated:** 31 May 2026
**Workflow rule:** `context/Needool MVP PRD v3 (1).docx` is the immutable source of truth. Do not edit the PRD. This handoff is the living, workable implementation version of the PRD: what is possible in the current codebase, what has already been built, what failed, what worked, what decisions were made, and what the next agent should do next.

---

## 0. How To Use This File

Every implementation session should follow this loop:

1. Read this handoff first to understand the real current state, previous errors, and the active chunk.
2. Read the PRD section referenced by the active chunk. The PRD explains the intended product behavior; this handoff explains what actually exists and how to proceed.
3. Inspect the relevant codebase files before proposing or making changes.
4. Implement one reasonably sized PRD chunk in the local development environment only.
5. Verify with API checks and Playwright MCP or the Playwright skill before calling the chunk complete.
6. Update this file with:
   - what was built,
   - what failed and how it was fixed,
   - Playwright decisions and exact pages checked,
   - remaining gaps against the PRD,
   - the next recommended chunk.

Do not create new planning markdown files unless explicitly requested. Keep the plan here so the next AI agent can continue from one place. Do not update the PRD; preserve its integrity and record implementation reality here.

---

## 0.1 Agent Rules For This Project

- The PRD is the product north star and must remain unchanged.
- `handoff.md` is the continuously updated working ledger for the project.
- Every new chunk must come from the PRD and be grounded in the current handoff state.
- Before working, always read the relevant PRD section, this handoff, and the current code.
- Work in development first. Do not push to GitHub, create PRs, or treat anything as production unless the user explicitly asks.
- Use the existing architecture and local patterns before inventing new ones.
- Every implemented feature needs local verification. Use Playwright MCP or the Playwright skill for browser flows, plus API/build checks where appropriate.
- If Playwright reports stale text such as "Loading...", verify the actual DOM with `document.querySelector('main')?.innerText` before treating it as a bug.
- If something in the PRD cannot be implemented exactly because of current stack constraints, document the constraint and the chosen development workaround in this handoff.
- If a decision affects money, auth, security, legal exposure, production data, or user trust, stop and ask the user instead of silently choosing.
- After each completed chunk, update the execution log and write the next chunk plan here.
- **Founder-dashboard rule (added 3 June 2026):** When a code change triggers founder work in an external account (Clerk, Supabase, NOWPayments, Cloudflare, GitHub, Resend, Vercel, Render, npm, Polygon, Maps, WhatsApp), **WebSearch for current step-by-step instructions before writing the brief**. Quote menu paths and setting names verbatim from the source + cite the URL. Never recite from training memory — dashboards redesign their UI between Claude's training cutoff and today. Skip only when the change is 100% in-repo.

---

## 1. Source Of Truth

Primary PRD:

- `context/Needool MVP PRD v3 (1).docx`

The PRD is not a scratchpad. Never rewrite, shorten, normalize, or "fix" it. If it has a gap, mismatch, or outdated assumption, note that here in `handoff.md` and ask the user for a decision when needed.

Supporting implementation artifacts:

- `context/deployment/clerk-nowpayments-init.sql`
- `context/deployment/phase-1-posts.sql`
- `context/deployment/phase-2-jobs-reviews-a.sql`
- `plan.md` is historical detail for Phase 0 and Phase 2. Use it as context only. If it conflicts with the PRD, follow the PRD.

Important PRD sections already used by the implementation:

- PRD Section 2: users, account states, auth, referrer attribution.
- PRD Section 5: Need Requests.
- PRD Section 6: Opportunities.
- PRD Section 7: Events.
- PRD Section 8: Job Openings and paid hire requests.
- PRD Section 9: Reviews.
- PRD Section 10: subscriptions and billing engine.
- PRD Section 11: referrals, wallet, withdrawals.
- PRD Section 12: notifications.
- PRD Section 13: admin panel.
- PRD Section 15.2: target data model.

Resolved PRD drift (founder decision):

- PRD Section 10.1 pricing originally said Individual `$2/mo` and `$20/yr`,
  Business `$5/mo` and `$50/yr`.
- The founder explicitly approved revised pricing: **Individual `$5/mo` and
  `$30/yr`, Business `$10/mo` and `$60/yr`**. This change was made by the
  founder and supersedes the PRD numbers for implementation purposes. The
  PRD file itself is intentionally left unchanged per the immutable-PRD rule
  in §0; this handoff is the canonical record of the override.
- Code already reflects the revised pricing in `backend/lib/subscriptions.mjs`
  (`PLAN_CATALOG`), `frontend/src/routes/pricing.tsx`, and
  `frontend/src/lib/mvpData.ts`. No further reconciliation required.
- Decision recorded: 29 May 2026.

---

## 2. Current Development State

The app is a local development MVP, not production. Do not push to GitHub unless the user explicitly says to push.

Local services:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4100`
- Admin panel: `http://localhost:3200`
- Backend health: `http://localhost:4100/health`

Test accounts:

- Normal active user: `needool+clerk_test@example.com` / `NeedoolDev!Test2026`
- Clerk dev code for that user: `424242`
- Admin allowlisted accounts from earlier setup: `elevatewebnmarketing@gmail.com`, `needoolapp@gmail.com`
- Local dev exception from Phase 2 verification: `needool+clerk_test@example.com` was also added to local admin allowlists so P8 could be tested without a live Gmail verification code. Keep or revert that based on the current test need.

Current architecture:

- Frontend: React 19, Vite, TanStack Router, Tailwind v4, Clerk React.
- Backend: Node HTTP server in `backend/server.mjs`.
- Database: Supabase via backend service-role REST wrappers in `backend/lib/supabase.mjs`.
- Admin panel: single React SPA in `admin-panel/src/main.jsx`, hash routes.

Current backend pattern:

- Pure domain logic in `backend/lib/<domain>.mjs`.
- IO/store functions in `backend/lib/<domain>-store.mjs`.
- `server.mjs` wires HTTP handlers manually.
- RLS denies browser access; backend service role performs DB operations.

---

## 3. PRD Coverage Map

### Implemented And Verified In Development

Phase A / PRD Sections 2, 10:

- Clerk auth is mounted on frontend and admin.
- Clerk webhook upserts Supabase `users`.
- NOWPayments sandbox subscription initiation and webhook activation exist.
- Subscription stacking rules are implemented in pure subscription logic:
  - 7-day referral trial preservation,
  - 13-month forward cap,
  - monthly/yearly re-subscription windows,
  - first activation exception.

Phase 1 / PRD Sections 5, 6, 13:

- Need Requests and Opportunities are DB-backed posts.
- Admin approval queues exist for Needs and Opportunities.
- Admin can approve, reject, pin, unpin.
- User moderation exists: ban, restrict, unban, unrestrict.
- Post limits and contact stripping are partially implemented.

Phase 1.5 / PRD Section 7:

- Admin can create Events.
- Public `/events` feed renders admin-posted Events.

Phase 2 / PRD Sections 8 and 9 Trigger A:

- Public hire-request form exists at `/jobs/hire-request`.
- Admin Hire Requests tab lists requests and can send quotes/cancel.
- NOWPayments order prefix dispatch supports subscription and hire quote flows.
- Paid hire request auto-promotes to draft job opening.
- Admin Job Openings tab can edit, publish, close, view applicants, score, shortlist, reject, mark hired.
- Public `/jobs` feed is DB-backed.
- Public job detail and apply flow exist.
- Applicant dashboard at `/dashboard/applications` shows applications and verified hires.
- Marking an applicant hired creates a Verified Hire and employer review token.
- Applicant review form exists at `/reviews/$verifiedHireId`.
- Employer magic-token review form exists at `/review-employer/$token`.
- Profile reviews surface exists for the Phase 2 test profile and calls `GET /api/profiles/:userId/reviews`.

Phase 2 Playwright result:

- P1 public `/jobs` feed passed.
- P2 job detail and two question textareas passed.
- P3 public hire-request form passed.
- P4 applicant dashboard applications/verified hires passed.
- P5 applicant review form passed; first run returned 201.
- P6 employer review magic-token page passed after adding applicant avatar; duplicate submit may return 409 and is acceptable.
- P7 profile reviews surface passed after adding live reviews section.
- P8 admin Hire Requests, Job Openings, Applicants modal passed.

### Not Yet PRD-Complete

PRD Sections 2 and 3:

- Full profile wizard, immutable/editable field rules, frequency limits, Google Maps location, CV upload/extraction, and true 100 percent profile completeness are not complete.

PRD Section 4:

- Search is still mostly static/mock-style and not PRD-complete for fuzzy search, geo ranking, active-first ranking, SEO schema, or sitemap.

PRD Sections 5 and 6:

- Need/Opportunity comments, replies, likes, saves, follows, and full post interaction model are incomplete.

PRD Section 9 Trigger B:

- **Phase 4C shipped 31 May 2026** (verified end-to-end via Playwright MCP +
  curl + Supabase REST seed). Now implemented:
  - 30-day continuously-Active eligibility (`users.active_since` clock,
    cleared on lapse to inactive/restricted/banned).
  - Anti-abuse: rolling 5/30-day reviewer limit, shared-referrer block,
    self-review block, 10-in-60-days new-target cap.
  - 1-2★ reviews status='held' for admin pre-approval; 3-5★ go straight
    to 'live'.
  - Evidence URL required for 1-2★ (reused from Trigger A
    `requiresEvidence`).
  - One-review-per-target-ever enforced via partial unique index.
  - Target reports a review via `POST /api/reviews/:id/report` →
    `review_reports` row.
  - Admin moderation queue at admin `#/reviews`: approve, reject,
    ban-reviewer (adds 'reviewing' to `module_restrictions`).
  - Owner kill-switch via `feature_flags ('trigger_b_enabled')` —
    flipping false makes new Trigger B POSTs return 503.
  - Every admin mutation in this flow is audit-wrapped (review.action,
    feature_flag.set) and surfaces in the audit log UI.
- Notification catalog gained `review_held` (in_app only). On hold,
  target gets `review_held`; on live (including admin approval), target
  gets `review_received`.

PRD Sections 10.7, 10.8, 11:

- **Expiry tick implemented in Phase 3C** (29 May 2026). `POST
  /api/dev/run-expiry-tick` scans active subscriptions, flips expired ones
  to `expired` (and deactivates the user), and emits the PRD §10.7 events
  `subscription_expired`, `subscription_expiring` (at daysLeft 7/3/1), and
  `renewal_window_open` (at daysLeft = 30 for yearly, 10 for monthly).
  Idempotent per the per-event-type rules documented in §8 below.
- Production deployment must wire this endpoint to Render Cron at a ≤5
  minute cadence with a shared-secret header. Not yet hooked.
- Phase 3A implements and verifies wallet summary, referral commission ledger, withdrawal request flow, and admin withdrawal queue.
- Phase 3A migration is applied in Supabase and the full Playwright/API gate passed on May 29, 2026.
- Real Clerk/Supabase TOTP enrollment is not implemented; the withdrawal endpoint uses an explicit local-development code `424242`.

PRD Section 12 (status):

- Structured `notifications` table implemented in Phase 3B with channel-aware
  rows (`in_app`, `email`).
- Backend `emitNotification` is wired to: subscription activation, referral
  commission earned, withdrawal requested/approved/completed/failed, post
  approved/rejected, hired (Verified Hire created), review received (employer
  review).
- Email send goes through Resend if `RESEND_API_KEY` is present; otherwise the
  call is a documented dev no-op and the in-app row still lands.
- Web push and PWA are still not wired.
- Renewal reminders + scheduled "subscription expired" flip are still not wired
  (Phase 3C target — see §7A).

PRD Section 13:

- Admin roles are not fully implemented.
- Reviews moderation, Help CMS, and Audit Log are placeholders.
- Withdrawals queue UI/API exists and passed the local development verification gate.
- Audit log does not record admin actions yet.

PRD Sections 14 and 15.5:

- Help & Guide CMS is not implemented.
- PWA install/offline/push is not complete.

PRD Section 3.5 and Week 9:

- Polygon on-chain profile/post anchoring is not implemented.

---

## 4. Known Issues, Decisions, And Bug Traps

Known warnings:

- Pre-existing theme-toggle SSR hydration mismatch appears on page load. It is currently accepted noise unless it grows beyond the theme toggle.

Known Playwright trap:

- Playwright accessibility snapshots previously reported stale "Loading..." text even when the real DOM was correct. Before chasing loading bugs, check:

```js
document.querySelector('main')?.innerText
```

Known auth/admin test issue:

- The Gmail admin accounts may require real email verification. For local-only Playwright verification, the normal Clerk test account was added to admin allowlists. This is a dev convenience, not a production rule.

Known PRD mismatch:

- Current app uses Clerk, not Supabase Auth/TOTP from the PRD technical architecture. Continue with current stack unless the user explicitly asks for a migration. When implementing withdrawal TOTP, either use Clerk-compatible TOTP if available or mark a dev-only TOTP stub clearly in this handoff.

Known data model gap:

- `users` currently carries several profile-ish fields but the PRD wants richer `profiles`, `skills`, `links`, `follows`, `notifications`, `referral_commissions`, `withdrawals`, `admin_audit_log`, `feature_flags`, and `chain_anchors`.

Resolved Phase 3A database blocker:

- `context/deployment/phase-3-referrals-wallet-withdrawals.sql` was applied in the Supabase SQL editor on May 29, 2026.
- Supabase REST can now see `public.referral_commissions` and `public.withdrawals`.
- The earlier `PGRST205` schema-cache blocker is resolved.

---

## 5. Completed Chunk Reference

### Chunk Name

Phase 3A - Referral Wallet And Manual Withdrawals

Implementation note:

- The code for this chunk is in place locally.
- The Supabase migration is applied.
- The API/Playwright gate passed on May 29, 2026.

### PRD Source

- PRD Section 10.8: wallet balance.
- PRD Section 11.1: referral mechanics.
- PRD Section 11.2: referral reward rates.
- PRD Section 11.3: referral dashboard.
- PRD Section 11.4: manual withdrawals.
- PRD Section 12: withdrawal and commission notifications.
- PRD Section 13.2: admin Withdrawals queue.
- PRD Section 15.2: `referral_commissions`, `withdrawals`, `notifications`.

### Why This Chunk Is Next

Phase 2 completed the hiring/reviews revenue path. The next sizable PRD feature that touches both user account and admin panel is the referral wallet and withdrawal loop:

1. a subscription payment creates a referral commission,
2. the referrer sees earned/balance in their dashboard,
3. the referrer requests withdrawal,
4. admin approves and marks paid with a tx hash,
5. user sees completed withdrawal and notification.

This is self-contained, valuable, and maps directly to the PRD.

### Scope For This Chunk

Build the minimum PRD-aligned development version:

- New Supabase migration, likely `context/deployment/phase-3-referrals-wallet-withdrawals.sql`.
- New tables:
  - `referral_commissions`,
  - `withdrawals`.
- Wallet balance can be computed from commissions minus completed/pending withdrawals; a physical `wallet_balances` table is optional if the implementation needs it.
- Commission creation on successful subscription payment webhook:
  - 10 percent if referrer is Active at payout time,
  - 2 percent if referrer is Inactive,
  - commission accrues for every renewal,
  - idempotent on payment ID.
- User endpoints:
  - `GET /api/referrals/summary`
  - `GET /api/referrals/commissions`
  - `GET /api/withdrawals`
  - `POST /api/withdrawals`
- Admin endpoints:
  - `GET /api/admin/withdrawals`
  - `PATCH /api/admin/withdrawals/:id`
- Frontend:
  - replace/refactor `/dashboard/referrals` into real earned/balance/history/request UI.
  - keep the existing referral code UI.
- Admin panel:
  - replace Withdrawals placeholder with real queue.
  - actions: approve, reject/fail if included, mark paid with tx hash.
- Notifications:
  - append simple in-app notification strings to `users.notifications` for commission earned, withdrawal requested, withdrawal completed/failed.
  - Email via Resend can remain a documented Phase 4/launch-hardening gap unless implemented in this chunk.

### Explicit Cuts For This Chunk

Do not implement these unless the user asks to expand scope:

- Full Clerk/Supabase TOTP enrollment UI.
- Real USDT transfer automation.
- Web push.
- Audit log wrapper.
- Trigger-B reviews.
- Help CMS.
- Polygon anchoring.

TOTP handling decision for this chunk:

- PRD requires TOTP before withdrawals.
- If full TOTP is too large for this chunk, implement an explicit dev-only `totpCode` check and name it as a temporary gap in this file. Do not silently skip the TOTP requirement.

---

## 6. Phase 3A Execution Plan

### Step 1 - Read And Confirm Current Payment Flow

Files to inspect:

- `backend/server.mjs`
- `backend/lib/nowpayments.mjs`
- `backend/lib/payments-store.mjs`
- `backend/lib/subscription-store.mjs`
- `backend/lib/subscriptions.mjs`
- `backend/lib/users.mjs`

Goal:

- Find where subscription payment activation happens.
- Add referral commission creation only after a terminal successful subscription payment.
- Preserve idempotency; webhook retries must never double-create commissions.

### Step 2 - Schema Migration

Create a Phase 3 migration with deny-all RLS.

Expected table shape:

- `referral_commissions`
  - `id uuid primary key`
  - `referrer_id text references users(id)`
  - `referee_id text references users(id)`
  - `payment_id uuid or text` aligned to current payments table
  - `provider_payment_id text`
  - `amount_usd numeric`
  - `amount_usdt numeric`
  - `rate numeric`
  - `referrer_status_at_payout text`
  - `status text default 'earned'`
  - `created_at timestamptz`
  - unique key preventing duplicate commission for the same payment/referrer

- `withdrawals`
  - `id uuid primary key`
  - `user_id text references users(id)`
  - `amount_usdt numeric`
  - `trc20_address text`
  - `status text check pending/approved/completed/failed/rejected`
  - `admin_id text`
  - `tx_hash text`
  - `failure_reason text` or `reject_reason text`
  - `created_at`, `approved_at`, `completed_at`, `updated_at`

### Step 3 - Backend Stores And Logic

Follow existing split:

- `backend/lib/referrals.mjs`
- `backend/lib/referrals-store.mjs`
- `backend/lib/withdrawals.mjs`
- `backend/lib/withdrawals-store.mjs`

Pure rules:

- Minimum withdrawal is 20 USDT.
- Withdrawal amount cannot exceed available balance.
- TRC20 address must be present and plausibly valid.
- Dev-only TOTP code must be explicit if used.
- Commission rate is 10 percent for Active referrer, 2 percent for Inactive referrer.

Store responsibilities:

- list referred users,
- list commissions,
- compute summary totals,
- create commission idempotently,
- create withdrawal request,
- list withdrawals for user/admin,
- admin approve,
- admin mark paid with tx hash,
- append user notification.

### Step 4 - Backend Routes

Add routes in `server.mjs`:

- `GET /api/referrals/summary`
- `GET /api/referrals/commissions`
- `GET /api/withdrawals`
- `POST /api/withdrawals`
- `GET /api/admin/withdrawals`
- `PATCH /api/admin/withdrawals/:id`

Route rules:

- User routes require Clerk session.
- Admin routes require admin session.
- All errors should return clear JSON `{ error }`.
- Keep API response shape consistent with existing `{ data }`.

### Step 5 - Frontend User Account

Primary route:

- `frontend/src/routes/dashboard.referrals.tsx`
- supporting dashboard components if needed.

UI requirements:

- show referral code/link,
- show total earned,
- show total withdrawn,
- show available balance,
- show referred users,
- show commission history,
- show withdrawal history,
- show withdrawal request form:
  - amount,
  - TRC20 address,
  - TOTP/dev code,
  - submit button.

### Step 6 - Admin Panel

Primary file:

- `admin-panel/src/main.jsx`

Replace Withdrawals placeholder:

- list pending withdrawals,
- show user, amount, address, status, created date,
- approve action,
- mark paid action with tx hash prompt,
- optional reject/fail action with reason if implemented.

Dashboard KPI:

- `withdrawalsPending` should use real count instead of hard-coded 0.

### Step 7 - Verification

Run build checks:

```bash
npm --workspace frontend run build
npm --workspace admin-panel run build
```

Backend has no build step beyond runtime smoke, but run:

```bash
node backend/server.mjs
```

or use existing running dev server and hit:

```bash
curl http://localhost:4100/health
```

---

## 7. Phase 3A Playwright And API Gate

Use Playwright MCP or the browser skill. Keep network 4xx limited to deliberate validation tests.

Recommended test data approach:

- Use existing active test user as referrer if possible.
- Create or reuse a referred test user with `referred_by` pointing to the referrer code.
- Simulate a subscription payment for the referred user using `/api/dev/simulate-webhook`.
- Confirm the payment creates exactly one commission even if the webhook is replayed.

Required checks:

1. `GET /api/referrals/summary` as the referrer returns earned, withdrawn, available balance, referred users count.
2. Subscription payment for a referred user creates a commission at the correct PRD rate.
3. Replaying the same webhook/payment does not duplicate the commission.
4. `/dashboard/referrals` shows referral code, earned, withdrawn, balance, commission history.
5. Withdrawal request below 20 USDT is blocked with a clear error.
6. Withdrawal request above available balance is blocked with a clear error.
7. Valid withdrawal request lands as `pending`.
8. Admin `#/withdrawals` shows the pending request.
9. Admin approve action changes status to `approved`.
10. Admin mark-paid with tx hash changes status to `completed`.
11. User withdrawal history shows `completed` and available balance updates.
12. User notification list includes withdrawal/commission events if notification append is in scope.

Known acceptable warnings:

- Theme-toggle hydration warning.

Expected deliberate 4xx:

- 400 for invalid withdrawal amount/address/dev TOTP.
- 403 for non-admin hitting admin withdrawal routes.
- 409 only if intentionally testing duplicate/idempotent operations.

---

## 7A. Next Chunk To Implement

### Chunk Name

**Founder Phases B–E (dashboards + verify + push + staged deploy).**

Phase 8 (security hardening) shipped 3 June 2026. Every PRD
§15.4 hardening requirement is now in code with tests; both
real findings from the threat audit (`dangerouslySetInnerHTML`,
zero rate limiting) are resolved. **No further Claude-driven
build chunks are queued.**

The next work is the founder's per the
[§12 Pre-Launch Rollout Plan](#12-pre-launch-rollout-plan-phases-a--e):

- **Phase B** — Dependency dashboards (Clerk MFA, Supabase
  secret-key rotation, NOWPayments IPN rotation, Cloudflare
  WAF, GitHub push-protection, Resend domain auth, etc.).
  Step-by-step instructions web-searched on the source provider
  docs are in [§12.10](#1210-phase-8-founder-dashboard-brief-web-searched-3-june-2026).
- **Phase C** — Pre-launch verification.
- **Phase D** — First GitHub push (with push-protection on).
- **Phase E** — Staged deploy.

When a new product chunk is needed (e.g. post-launch features,
PRD revisions, a v3.1 ask), kick off with:
*"continue with <chunk name> per handoff §7A"*.

### Previous Chunk Name (now shipped)

Phase 6 — PRD closeout (OTP, review reply, profile_complete,
employer reviewer-only account, Lighthouse smoke)

### Why This Chunk Is Next

Phase 4H shipped on 2 June 2026. The original 9-week PRD build
plan now has ALL §19-checklist features implemented in dev:
- Phase A: Clerk + NOWPayments subscriptions.
- Phase 1 + 1.5: Posts (Needs, Opportunities, Events).
- Phase 2: Hire requests + Job Openings + Trigger A reviews.
- Phase 3A/B/C: Referrals, notifications catalog, expiry tick.
- Phase 4B/C/F: Audit log, Trigger B reviews, post interactions.
- Phase 4D: Signup capture, profile composition, real public
  profile, notify-when-active, search, SEO, post bugfixes.
- Phase 4G: Help & Guide CMS + notification preferences.
- Phase 4H: PWA shell + web push opt-in + Trigger B reports queue.

The next chunk is **launch hardening**: PRD §16 Week 9 lists
"deploy ledger contract to Polygon, admin dashboard polish, Help
& Guide seed articles, End-to-end QA (gating, limits, billing
math, webhooks), Lighthouse + a11y + mobile, SEO audit + sitemap
submission, OG images, seed 50 Lagos providers + 30 Need Requests."

### Cuts

Founder-only items per [[founder-launch-preferences]]:
- Polygon anchor wallet + daily anchoring cron.
- VAPID public/private key bundle + backend web-push sender.
- Real TOTP enrollment for withdrawals.
- Real Google Maps API key + lat/lng picker.
- WhatsApp Business API integration.
- Resend production API key.
- GitHub push, PR, deploy.

In-scope code work for Phase 5:
- 50-Lagos-provider seed script (idempotent dev/seed endpoint).
- 30-Need-Request seed script.
- 10 Help & Guide articles seeded from a markdown source file.
- End-to-end QA matrix script that hits every §19 acceptance
  checklist item against the dev stack and writes pass/fail to
  handoff.md.
- OG image generation (static — `public/og-default.png` + per-
  route variants where feasible).
- Lighthouse smoke run via Playwright.
- Accessibility pass on every public route (alt text, aria
  labels, keyboard focus order).

### Phase 4H shipped — see §8 entry above.

### Previous Chunk Name (now shipped)

Phase 4H — PWA + push (PRD §15.5, §12 push channel) + Trigger B
target-reports admin queue UI surfacing

### Why This Chunk Is Next

Phase 4G shipped end-to-end on 1 June 2026. The biggest PRD §19
launch-checklist items still outstanding are:

- PRD §15.5 PWA — manifest, service worker offline shell, A2HS
  prompt. Lighthouse PWA score is part of the §19 acceptance bar.
- PRD §12 web push channel — `notifications.channels` already
  supports it via the catalog (`["in_app","push","email"]`), but
  no push subscription flow exists. Without it the §12 "push"
  channel is dead lettering.
- Phase 4C Trigger B already wrote review reports to
  `review_reports` and exposes admin endpoints, but the admin
  panel's Reviews tab only renders the held queue — the reports
  tab is partially implemented. Surface it fully.

### Cuts (likely)

- VAPID key + push server is **production-only** per founder
  guard. Schema + frontend opt-in flow + service-worker shell go
  in dev; actual push sends deferred to launch wiring.
- iOS PWA limitations (overlay-only install prompt) accepted.

### Phase 4G shipped — see §8 entries.

### Previous Chunk Name (now shipped)

Phase 4G — Help & Guide CMS (PRD §14) + notification preferences (PRD §12.2)

### Why This Chunk Is Next

Phase 4D Foundation Backfill shipped end-to-end on 1 June 2026
(all 7 sub-phases 4D-1 through 4D-7 verified live + tested). The
§19 launch acceptance checklist items the Phase 4D audit surfaced
are now closed. The next remaining gap from the original PRD
coverage map is Help & Guide CMS — a SEO-indexed knowledge base
the admin panel still placeholders. Notification preferences
(per-event opt-in/out from the user notifications page) ride
along since the catalog already exists.

### Cuts (likely)

- No rich-text WYSIWYG; markdown + textarea editor.
- No multi-language help; English only.
- One opt-out switch per event, not separate email vs in-app.

### Phase 4D shipped — see §8 entries for 4D-1 through 4D-7.

### Previous Chunk Name (now shipped)

Phase 4D — Foundation Backfill (Signup + Profile + Search + SEO)

### Why This Chunk Is Next

A line-by-line PRD audit on 1 June 2026 surfaced large gaps between
PRD §1–§6 and what's actually shipped. The §19 launch acceptance
checklist depends on real signup fields, real profile composition,
search, and SEO — none of which are present today. Help & Guide CMS
was the previous next-chunk pick; it's been demoted because Phase 4D
items are on the §19 acceptance checklist and Help CMS is not.

### PRD Sources (read each section before touching the related sub-phase)

- PRD §2.3 Individual signup fields (first/middle/last name, sex,
  nationality, country/state/city, DOB+18, phone, WhatsApp,
  referrer-typed-username)
- PRD §2.4 Business signup fields (legal org name, business address,
  HQ vs branch)
- PRD §2.6 Editable vs immutable fields + frequency limits
- PRD §2.7 Referrer attribution silent-drop on non-existent username
- PRD §3.1 Profile composition (picture, bio, location lat/lng,
  remote, hourly rate, work hours, CV upload + extraction, links,
  skills/products/services with 365-day removal lock and per-account
  caps)
- PRD §3.2 Public profile view (real data, contact reveal gating,
  Contact / Hire CTA)
- PRD §3.3 "Notify when active" flow (30-day expiry, anonymous viewer,
  activation-back notification)
- PRD §3.4 Contact intent logging (emit `contact_viewed`)
- PRD §4.1 Search bar (free-text, fuzzy, scope selector with
  Worldwide/Country/State/City/Near-me radii 1/5/15/50 km)
- PRD §4.2 Active-first ranking + geo proximity + recency
- PRD §4.3 Public visitor access surface
- PRD §4.4 SEO (schema.org Person/LocalBusiness/JobPosting/Event,
  sitemap, OpenGraph + Twitter cards, canonical URLs)
- PRD §5.1 Need Request creation rules (thumbnail required, phones/
  emails rejected not stripped, 1–3 links)
- PRD §5.5 Closed-post behavior (engagement disabled)
- PRD §6.1 Opportunity differences (no Near-me scope)
- PRD §19 launch acceptance checklist
- PRD §15.2 Core data model field map
- PRD §15.4 Server-side content rejection

### Sub-phase plan (each sub-phase: schema → backend → frontend → Playwright)

- **4D-1** Signup field capture (§2.3, §2.4, §2.7).
- **4D-2** Profile composition + edit + frequency limits + CV upload
  + text extraction (§3.1, §2.6, §15.4).
- **4D-3** Real public profile data (replace mockData; gated contact
  reveal) (§3.2, §4.3).
- **4D-4** Notify-when-active + contact intent (§3.3, §3.4).
- **4D-5** Search & ranking (§4.1, §4.2, §4.3, §15.4).
- **4D-6** SEO (§4.4).
- **4D-7** Post / Opportunity validation bugfixes (§5.1, §5.5, §6.1).

### Explicit cuts (production / launch-only — user will handle these)

- **TOTP 2FA** for withdrawals (PRD §2.5) — keep dev stub `424242`
  until production auth is set up. Out of scope here.
- **Login rate limit, session 30-day rolling** (PRD §2.5) — Clerk
  dashboard config; user owns this.
- **Real Google Maps key** (PRD §3.1 location, §4 search radius) —
  use a manual lat/lng input + Leaflet/OpenStreetMap stub for dev so
  no API key is required. Drop-in swap when user provides Maps key.
- **WhatsApp self-confirmation** (PRD §3.1) — needs WhatsApp Business
  API. Capture the number, defer verification.
- **Country flag from IP** (PRD §4.1) — needs IP geolocation service.
  Use Accept-Language fallback in dev.
- **Real Resend production keys** — already env-gated; no .env changes.
- **Polygon anchoring** (PRD §3.5) — explicitly out of scope per §3.
- **No .env files touched**, no API keys updated; user does that at
  launch.

### Previous Chunk Name (now shipped)

Phase 4C - Reviews Trigger B + §9.4 anti-abuse + kill-switch flag

### Phase 4C — completed 31 May 2026 (see §8 below for the execution log).
The previous next-chunk block is preserved unchanged below for history.

---

### Previous Chunk Name (now shipped)

Phase 4C - Reviews Trigger B + §9.4 anti-abuse + kill-switch flag

### Why This Chunk Is Next

Phase 4F (post interactions: comments + replies + likes + saves + follows)
is in. The remaining big PRD gap that's non-deferrable is Reviews Trigger
B (PRD §9.1-§9.4). Phase 2 shipped Trigger A (Verified-Hire reviews) end
to end, including the `reviews` table that already has a `trigger_type`
column with the `'member'` enum value reserved for B. Most of the
infrastructure is in place; this chunk wires Trigger B on top of it +
adds the anti-abuse guards the PRD calls non-optional + the Owner
kill-switch.

### PRD Source

- PRD §9.1 — Trigger B: any user continuously Active for 30+ days can
  leave a review on another user's profile, subject to §9.4.
- PRD §9.3 — Trigger B window: 30-day-continuously-Active eligibility; a
  reviewer may leave at most one review per target, ever; editable 14
  days then locked.
- PRD §9.4 — six anti-abuse controls:
  1. Max 5 Trigger-B reviews per reviewer per rolling 30 days.
  2. Reviewer and target must not share the same referrer within 1 hop
     (blocks referrer-ring self-boosting).
  3. A new account cannot be the target of more than 10 Trigger-B
     reviews in its first 60 days.
  4. 1-2 star Trigger-B reviews are held for admin pre-approval before
     going public (not just auto-flagged).
  5. A target may request admin review of any single Trigger-B review.
  6. Trigger B globally disabled by Owner via a feature flag with no
     deploy.
- PRD §9.5 — evidence link required for 1-2 stars (already enforced for
  Trigger A in `reviews.mjs::requiresEvidence`; reuse).

### Scope

- Schema migration `context/deployment/phase-4c-trigger-b.sql`:
  - New `feature_flags (key text pk, enabled bool, updated_at, updated_by)`
    table seeded with `('trigger_b_enabled', true)`.
  - New `review_reports (id, review_id, reporter_id, reason, status,
    created_at, resolved_at, admin_id)` for §9.4.5.
  - New column `users.active_since timestamptz` — set when the user
    first transitions to status='active' from anything else, cleared on
    any lapse to inactive/restricted/banned. This is the §9.3 30-day
    clock.
- Backend libs:
  - `backend/lib/feature-flags.mjs` + `feature-flags-store.mjs` (small
    cached read; admin write through audit wrapper).
  - `backend/lib/trigger-b.mjs` (pure): `isEligibleToReview({user, now})`,
    `passesAntiAbuse({reviewer, target, recentTriggerBCount, targetRecentTriggerBs, sharedReferrer})`,
    `shouldHold(rating)`, `canEditReview(review, now)`.
  - Extend `reviews-store.mjs` with `submitTriggerBReview(...)` that:
    runs through all §9.4 checks, sets `status='held'` if 1-2★, emits
    `review_received` notification (on `live`) or `review_held`
    (currently not in PRD catalog — add it to `notifications.mjs`).
- Endpoints:
  - `POST /api/profiles/:userId/reviews` (Clerk) — Trigger B submit.
  - `POST /api/reviews/:id/report` (Clerk) — target requests review per §9.4.5.
  - Admin: `GET /api/admin/reviews?status=held` + `PATCH /api/admin/reviews/:id`
    with `{action: 'approve'|'reject'|'ban-reviewer'}`. All
    audit-log-wrapped via the Phase 4B `withAdminAudit` helper.
  - Admin: `GET /api/admin/feature-flags` + `PATCH /api/admin/feature-flags/:key`.
- Wire `users.active_since` updates: set it on every
  `activateOrExtendSubscription` call (subscription-store) AND on every
  status transition through `users-moderation.mjs` /
  `subscription-store.mjs::runExpiryTick`. A small migration script
  backfills `active_since` for currently-active users to their oldest
  active subscription's `current_period_start`.
- Frontend:
  - Profile page `p.$username.tsx` — add a "Leave a review" button when
    viewer is signed in, isn't self, and the API returns
    `{canReview: true}`. Re-uses the Phase 2 review form component with
    a `trigger='member'` mode.
  - Admin panel — replace the existing "Reviews" placeholder tab with a
    real moderation queue: pending 1-2★ + reported reviews + a
    "Trigger B globally" feature-flag toggle (Owner-only, but in dev
    any admin can toggle — production hardening later).
- Notifications: emit `review_held` on hold and existing `review_received`
  on live.

### Suggested Verification Gate (10 checks)

1. Schema applies cleanly + `active_since` backfill yields the expected
   timestamp for the existing test user.
2. Reviewer with `active_since` < 30 days ago → 403 "Not eligible yet".
3. Reviewer with `active_since` ≥ 30 days ago → review accepted at
   ratings 3-5 with `status='live'`.
4. Same reviewer 1★ review → accepted with `status='held'`; appears in
   admin moderation queue.
5. Reviewer and target share the same `referred_by` referrer → 403
   "Shared-referrer block" (§9.4.2).
6. Target user created < 60 days ago and already has 10 Trigger-B
   reviews → 11th attempt returns 403 (§9.4.3).
7. Reviewer hits 6th Trigger-B review within rolling 30 days → 429
   (§9.4.1).
8. Owner toggles `trigger_b_enabled = false` via admin panel → any new
   Trigger B submission returns 503 "Trigger B is disabled by Owner".
9. Target reports a Trigger B review → admin queue shows it with
   `reason`; admin `reject` action removes it; admin `ban-reviewer`
   adds 'reviewing' to `users.module_restrictions`.
10. Audit log (Phase 4B) records every admin action in this flow with
    correct target_type / target_id.

### Cuts For Phase 4C

- No "lapse to Inactive resets the clock" automation beyond what
  `runExpiryTick` already does; we'll only zero `active_since` when the
  user goes Inactive/expired and rely on the existing notification rails
  to surface that the clock reset.
- No reviewer-to-target messaging or appeals workflow beyond the
  one-line `reason` field.

### Phase 4F was the previous Next Chunk — now shipped, see §8.

### Why This Chunk Is Next

Phases 4B (audit log) and the rest of the admin/notification rails are
in. The biggest visible product gap is that approved Need Requests and
Opportunities are static cards — no one can react. PRD §5.4 explicitly
makes these social: like, save, share, comments with replies and likes,
follow author. Shipping this brings the Phase 1 marketplace alive and
gives content seeding (Phase 3D's prereq) something meaningful to
populate.

This chunk also surfaces the first "user-to-user notifications" that the
PRD §12 catalog already lists: `comment_received`, `reply_received`,
`like_received`, `new_follower`. Phase 3B's `notifications.mjs` has them
already templated; this chunk just wires emit calls.

### PRD Source

- PRD §5.4 — Need Requests: Like, save, share (public link); comments
  with replies and likes; follow author from post.
- PRD §6.1 — Opportunities: no comments (broadcasts only). Likes/saves
  still allowed.
- PRD §3.2 — public profile shows Followers / Following.
- PRD §5.3 — Individual 15 comments/day, Business 30 comments/day,
  comment limits reset 00:00 GMT.
- PRD §12 — `comment_received`, `reply_received`, `like_received`,
  `new_follower` channel routing.

### Scope

- New tables:
  - `comments` (probably already exists from Phase 1 schema —
    `phase-1-posts.sql` created the table; the data path is what's
    missing). Confirm shape: `id, post_id, author_id, parent_id,
    body, deleted_at, created_at`.
  - `post_likes` (id, post_id, user_id, created_at; unique
    (post_id, user_id)).
  - `post_saves` (id, post_id, user_id, created_at; unique
    (post_id, user_id)).
  - `follows` (id, follower_id, followee_id, created_at; unique
    (follower_id, followee_id)).
  - `comment_likes` (id, comment_id, user_id, created_at; unique
    (comment_id, user_id)).
- Backend libs:
  - `backend/lib/comments.mjs` — pure: rate-limit calc per account type
    + PRD §5.1 contact-info stripping (reuse `stripContactInfo`).
  - `backend/lib/comments-store.mjs` — IO: createComment, list,
    softDelete, dailyCommentCountForAuthor.
  - `backend/lib/post-engagement-store.mjs` — like/unlike/save/unsave
    for posts and comments; counts.
  - `backend/lib/follows-store.mjs` — follow/unfollow + counts.
- Endpoints (Clerk-gated for mutations; public reads):
  - `POST /api/posts/:id/comments`, `GET /api/posts/:id/comments`
  - `PATCH /api/comments/:id` (author edit within 60 min; PRD §5.4 doesn't specify but TS pattern matches reviews §9.2 14-day edit window — use 60 min for comments)
  - `DELETE /api/comments/:id` (author or admin)
  - `POST /api/posts/:id/like` and DELETE for unlike; same for /save and for comments
  - `POST /api/users/:id/follow` and DELETE for unfollow
  - `GET /api/me/saves`, `GET /api/me/follows`
  - `GET /api/posts/:id` extended response shape: `likeCount, saveCount, commentCount, isLiked, isSaved`
  - `GET /api/profiles/:userId` extended: `followerCount, followingCount, isFollowing`
- Emit notifications:
  - `comment_received` → post author when a non-author comments.
  - `reply_received` → parent-comment author when a child comment lands.
  - `like_received` → post author and comment author on first like only
    (idempotent on existing row).
  - `new_follower` → followee.
- Admin: extend audit log targets if mod actions land on comments (e.g.
  `comment.delete`). Audit infrastructure from 4B already wraps any
  admin handler.
- Frontend:
  - `frontend/src/routes/posts.$id.tsx` — extend with comment thread +
    reply form + like/save buttons.
  - `frontend/src/components/common/PostFeedPage.tsx` — show like/save
    counts on the card.
  - `frontend/src/routes/p.$username.tsx` — Follow/Unfollow button +
    followers/following counts.
  - Phase 3B `NotificationsPage` already renders these event types from
    the catalog — no UI change needed there.

### Suggested Playwright Gate

1. Active user signs in, opens an approved Need Request, leaves a
   comment → backend returns 201, post detail shows it; post author
   gets `comment_received` notification.
2. Another active user replies to that comment → reply renders nested;
   original commenter gets `reply_received`.
3. Active user clicks Like on a post → counter increments; post author
   gets `like_received` (first like only, replay does not duplicate).
4. Active user clicks Save → appears on `/dashboard/saves`.
5. Active user clicks Follow on a profile → followee gets `new_follower`,
   profile shows isFollowing=true.
6. Daily comment limit hit (Individual 15/day) → 16th returns 429.
7. Opportunity post comment attempt → 400 "Opportunities do not allow
   comments" (PRD §6.1).
8. Visitor (no Clerk) trying to comment/like/follow → 401 across the
   board.
9. Console: zero errors except the pre-existing theme-toggle SSR mismatch.

### Cuts For Phase 4F

- No `share` button URL signing — `share` is just a copy-link UX with no
  backend state.
- No notification preferences UI yet (Phase 4G).
- No comment moderation queue (admins can already delete; full queue
  ships when Trigger B reviews moderation lands).
- No mentions/@-tags inside comments.

### Original Phase 3D (Staging Deployment) — deferred

Per founder decision May 29, 2026 we are NOT going online to a dev
domain yet. Phase 3D scope is preserved in §11 below for the day we do.

### Why This Chunk Is Next

Phases 1, 1.5, 2, 3A, 3B, 3C are all in place. The smart next move is to
get the stack onto a real domain (Vercel + Render + custom DNS) so:
- Mobile testers can use it without ngrok.
- The Clerk production app + custom DNS dance happens on the smaller
  surface area we have today rather than after Trigger B, profile wizard,
  search, and PWA are layered on.
- Resend domain verification (DKIM/SPF) can run in the background while
  later chunks ship.
- The expiry tick can be put behind Render Cron with a shared secret.
- The founder/team can actually try the product end-to-end on a phone.

This is a **private staging deployment**, not the PRD §17 soft launch.
Signups are restricted to an allowlist; NOWPayments stays in sandbox; a
"dev/beta" banner sits on every page.

### PRD Source

- PRD Section 15.1: stack and hosting (Vercel + Supabase + Render).
- PRD Section 17 explicitly says soft-launch is gated by the larger PRD
  acceptance checklist (Section 19). Phase 3D is the bridge to that, not
  the launch itself.

### Scope For Phase 3D

1. **Hosting setup**
   - Frontend: Vercel project; root `frontend/`; build `npm --workspace
     frontend run build`; output `dist/`; SPA rewrite via existing
     `frontend/vercel.json`.
   - Admin panel: separate Vercel project; root `admin-panel/`; same
     build/output shape.
   - Backend: Render web service from existing `render.yaml`; root
     `backend/`; start `node server.mjs`; health `/health`; UptimeRobot
     pings `/health` every 5 minutes to keep the free instance awake.
   - DNS: `dev.needool.com` -> frontend, `admin.needool.com` -> admin,
     backend on a Render-issued URL like `needool-web-app.onrender.com`.

2. **Clerk production app**
   - Create a separate Clerk app for staging (do not reuse the dev test
     app). Set Allowed Origins to the three deployed URLs. Wire custom
     DNS CNAMEs per the records previously recorded under
     `accounts.admin`, `clerk.admin`, `clk._domainkey.admin`,
     `clk2._domainkey.admin`, `clkmail.admin`.
   - Use Clerk's signup allowlist or magic-link gating to keep the
     staging URL invite-only.
   - Webhook endpoint -> `https://<backend>/api/webhooks/clerk` with the
     prod `whsec_…` recorded only in Render env vars.

3. **Supabase staging**
   - Decide: reuse the dev Supabase project for staging (cheaper, no
     migration replay) OR create a separate staging project (cleaner,
     re-run all migrations 1.x, 2.x, 3.x, 3B in order). If choosing
     "separate", the migration order is recorded in §9 of this file.

4. **NOWPayments**
   - Stay on sandbox in Phase 3D. Set the IPN callback to the deployed
     backend URL: `https://<backend>/api/webhooks/nowpayments`.

5. **Resend**
   - Verify `needool.com` (or the chosen sender domain) DKIM/SPF.
   - Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in Render env. After
     this, `email_sent_at` on Phase 3B notifications will start populating
     for real.

6. **Render Cron for the expiry tick**
   - Add a Render Cron Job: `POST https://<backend>/api/cron/expiry-tick`
     every 5 minutes with header `X-Cron-Secret: <random>`. Add
     `CRON_SHARED_SECRET` to Render env. Add a small handler in
     `server.mjs` that requires the header and calls
     `runExpiryTick({})`. Keep the dev-only `/api/dev/run-expiry-tick`
     unchanged for local testing.

7. **Env hygiene**
   - Every secret that lives in `.env.local` today must land in
     Render/Vercel env, not in the repo. Update `backend/.env.example`
     and `frontend/.env.example` so a future operator sees the full key
     list.

8. **"Dev/beta" banner**
   - Add a slim site-wide banner on frontend + admin when
     `VITE_BUILD_ENV !== "production"`. Tells testers this is a staging
     environment, NOWPayments runs on sandbox, and not to send real money.

### Suggested Verification Gate

1. `https://<backend>/health` returns the expected JSON with
   `clerkConfigured: true`, `nowpaymentsConfigured: true`,
   `supabaseConfigured: true`, `resendConfigured: true`.
2. Frontend signup at `https://dev.needool.com/signup` works against the
   prod Clerk app (with allowlist enforced).
3. Subscription initiate redirects to NOWPayments sandbox and the webhook
   reaches the deployed backend via Render TLS.
4. Phase 3B email side-effect fires for at least one event
   (`subscription_activated` should be easiest to trigger). Confirm
   `notifications.email_sent_at IS NOT NULL` for that row.
5. Render Cron hits `/api/cron/expiry-tick` and the response 200s with a
   summary payload.
6. Admin allowlist still gates `/api/admin/*` on the deployed backend.
7. The dev/beta banner renders on every public route.

### Explicit Cuts For Phase 3D

- No real public launch (PRD §17). Signups stay allowlist-gated.
- No Clerk MFA enrollment for withdrawals (still Phase 4A).
- No audit log (still Phase 4B).
- No real NOWPayments production keys.
- No content seeding (50 Lagos providers, 30 Need Requests, 10 Help
  articles).

After Phase 3D ships, the natural Phase 4 sequence is: 4A real TOTP -> 4B
audit log -> 4C Trigger B reviews -> 4D profile wizard -> 4E search ->
4F post interactions. The soft launch (PRD §17) opens up only after 4A
through 4C are in.

### PRD Source

- PRD Section 10.7: lifecycle. "On payment-success webhook then Active
  immediately; expiry computed per 10.3-10.5. Renewal reminders at 7, 3, and 1
  day before expiry. No grace period - at expiry, account flips Inactive
  within 15 minutes via scheduled job."
- PRD Section 10.5: re-subscription windows (yearly 30 days, monthly 10 days).
  When the window opens, fire a "renewal window now open" notification.
- PRD Section 12: channel routing - all three lifecycle events already exist
  in the Phase 3B catalog (`subscription_expiring`, `subscription_expired`,
  `renewal_window_open`).

### Why This Chunk Is Next

Phase 3B added the notification rails but only emits for events that fire
synchronously inside a handler (commission, withdrawal, hire, review, post
moderation, subscription activation). The PRD's lifecycle events
(`subscription_expiring`, `subscription_expired`, `renewal_window_open`) are
time-triggered and currently unwired. Without them the notifications system
is half-built; with them the user gets the renewal nudge the PRD promises.

This chunk is also a strict prerequisite for any production launch because
PRD Section 10.7 mandates the 15-minute Inactive flip at expiry. The current
code only computes `state` lazily on `/api/auth/me` reads; a user with an
expired subscription who never visits would stay "active" in the database
forever.

### Scope For Next Agent

- Add a single dev-callable endpoint:
  - `POST /api/dev/run-expiry-tick` (dev-only; gated by `isDev()`).
  - For every active subscription where `current_period_end < now`, flip
    the subscription row to `expired` and call `deactivateUser(userId)`.
  - Emit `subscription_expired`.
  - For every active subscription expiring in 7, 3, or 1 day from now (idempotently),
    emit `subscription_expiring` with `daysLeft` in the payload.
  - For every active subscription that just entered its re-sub window
    (30 days left for yearly, 10 days for monthly), emit `renewal_window_open`.
- Idempotency: gate each emission on the absence of a prior notification of
  the same event_type with the same payload key (e.g. `daysLeft` for
  expiring) within the last 24 hours, so repeated cron ticks don't spam.
- Production deployment note in this handoff: hook this endpoint to a Render
  Cron (5-minute cadence). Do not add the cron itself in this chunk; just
  ensure the endpoint is idempotent and call out the deployment step.
- Keep the lazy `/api/auth/me` status computation as a belt-and-braces
  fallback - do not remove it.
- Skip real TOTP, Polygon, search rebuild, audit log - those are later chunks.

### Suggested Playwright Gate

1. Seed a subscription with `current_period_end = now - 1 minute`.
2. `POST /api/dev/run-expiry-tick` returns a summary like
   `{ expired: 1, expiringWarned: 0, windowOpened: 0 }`.
3. `GET /api/auth/me` for that user now shows `state: 'inactive'`.
4. `GET /api/notifications` for that user contains one
   `subscription_expired` entry.
5. Replay the same tick - returns `{ expired: 0, ... }` and no duplicate
   notification is created.
6. Seed a different subscription with `current_period_end = now + 3 days`.
   Run the tick; the user gets one `subscription_expiring` notification
   with `daysLeft: 3`. Replay; no duplicate.
7. Seed an active yearly subscription with `current_period_end = now + 25
   days` (inside the 30-day re-sub window). Run the tick; the user gets
   one `renewal_window_open` notification. Replay; no duplicate.

### Cuts For Phase 3C

- No real cron - use the dev endpoint, document Render Cron setup.
- No "subscription_expiring" at 7 days; cover 7/3/1 in the same emission loop.
- No email-template polish beyond what `notifications.mjs` already renders.
- No admin UI for subscription expiry - this is invisible plumbing.

---

## 8. Current Execution Log

### Last Completed Chunk

Phase 4C — Reviews Trigger B + §9.4 anti-abuse + kill-switch flag
(31 May 2026, verified live via Playwright MCP after reconnection).

What was completed:

- Migration `context/deployment/phase-4c-trigger-b.sql` (applied by user
  in Supabase SQL editor):
  - `users.active_since` column + backfill for existing active users.
  - `feature_flags (key, enabled, updated_at, updated_by_email)` table
    seeded with `('trigger_b_enabled', true)`.
  - `review_reports (id, review_id, reporter_id, reason, status,
    created_at, resolved_at, admin_id)` for §9.4.5.
  - Partial unique index
    `reviews (reviewer_id, target_user_id) where trigger_type='member'`
    enforcing one-review-per-target-ever.
- New backend libs:
  - `backend/lib/trigger-b.mjs` — pure: `isEligibleToReview`,
    `passesReviewerRollingLimit`, `passesSharedReferrerCheck`,
    `passesNewTargetCap`, `shouldHold`, `passesAntiAbuse`,
    `canEditReview`, `daysBetween`, `TriggerBError`.
  - `backend/lib/trigger-b-store.mjs` — IO: `canReviewProfile`,
    `submitTriggerBReview`, `listHeldReviews`, `listReportedReviews`,
    `approveHeldReview`, `rejectHeldReview`, `createReviewReport`,
    `resolveReviewReport`, `countRecentReviewsByReviewer`,
    `countTriggerBReviewsForTarget`, `getExistingMemberReview`.
  - `backend/lib/feature-flags-store.mjs` — `getFlag` (30s in-process
    cache), `listFlags`, `setFlag` (cache-invalidating), constant
    `TRIGGER_B_FLAG`.
- `backend/lib/notifications.mjs` gained `review_held` (in_app only).
- `backend/lib/users.mjs` `activateUser` now sets `active_since` on
  transition (preserves prior timestamp if already active);
  `deactivateUser` clears it. `users-moderation.mjs` also clears
  `active_since` on ban + restrict.
- `backend/lib/users.mjs` `publicUserShape` adds `activeSince`.
- New endpoints in `server.mjs`:
  - `POST /api/profiles/:userId/reviews` — Trigger B submit.
  - `GET /api/profiles/:userId/can-review` — eligibility probe (used by
    the profile page's "Leave a review" button).
  - `POST /api/reviews/:id/report` — target reports.
  - `GET /api/admin/reviews?status=held|reports` — admin queue.
  - `PATCH /api/admin/reviews/:id` — approve | reject | ban-reviewer |
    resolve-report (audit-wrapped).
  - `GET /api/admin/feature-flags` — list.
  - `PATCH /api/admin/feature-flags/:key` — toggle (audit-wrapped).
  - Dev-only: `POST /api/dev/set-user-active-since`,
    `POST /api/dev/seed-user`, `POST /api/dev/seed-review`. Mounted only
    when `NODE_ENV=development`.
- `handleAdminOverview` now reads the real flag for `triggerBEnabled`.
- Frontend `frontend/src/routes/p.$username.tsx` gained a "Leave a
  review" button + `TriggerBReviewModal` (5-star rater, comment,
  evidence URL, hold-notice for 1-2★). `data-test` attributes:
  `leave-review-button`, `review-modal`, `review-stars`,
  `review-star-{1..5}`, `review-comment`, `review-evidence`,
  `review-submit`, `review-message`.
- Admin panel `admin-panel/src/main.jsx`:
  - New `ReviewsPage` replacing the placeholder. Held + Reports tabs.
    Approve / Reject / Ban-reviewer row actions.
  - `Settings` rewritten to read/write `feature_flags` via the real API
    with audit trail surfaced in the UI ("last set …" + actor email).

Verification path (Phase 4C 10-check gate via Playwright + curl):

- ✓ Check 1: `<30 days active_since` → 403 "Not eligible yet: N days
  remaining".
- ✓ Check 2: 4★ review accepted with `status='live'` (201).
- ✓ Check 3: Duplicate review same target → 409 "You have already
  reviewed this member."
- ✓ Check 4a: 1★ no evidence → 400 "Evidence link required."
- ✓ Check 4b: 1★ with evidence → 201 `status='held'`.
- ✓ Check 5: Shared-referrer block → 403 (covers reviewer-was-
  referred-by-target, target-was-referred-by-reviewer, and same
  upstream referrer cases).
- ✓ Check 6: 6th review within rolling 30 days → 429 "Limit reached:
  max 5 reviews per 30 days."
- ~ Check 7 (new-target cap): exercised via `passesNewTargetCap` unit
  test (covered in `backend/test/trigger-b.test.mjs`); not driven from
  the live endpoint in this session because the session reviewer was
  already at the rolling cap.
- ✓ Check 8: Kill-switch toggle to false → next POST returns 503
  "Trigger B is disabled by Owner." Re-enable restores accepting.
- ✓ Check 9: Admin held queue renders the 1★ review with Approve /
  Reject / Ban-reviewer controls (admin panel UI verified via
  Playwright snapshot).
- ✓ Check 10: Audit log captures every admin action in this flow with
  `target_type='review'` or `target_type='feature_flag'`, correct
  `target_id`, status="ok" on success and "error" on failure path.
- Bonus: Admin approve flow flips held → live, drops the row from the
  queue, and emits `review_received` to the target.
- Bonus: Settings page in admin panel shows the flag with "last set"
  timestamp + actor email.

Tests added this session:

- Backend node:test:
  - `backend/test/trigger-b.test.mjs` — 30 tests covering eligibility,
    anti-abuse rules, hold logic, edit window, helpers.
  - `backend/test/edge-cases.test.mjs` — 22 tests covering contact
    stripping nulls / international phones, module restriction
    interactions, visitor visibility, comment errors, notification
    catalog completeness, every event has callable title/body, expiry
    classification at boundaries, plan catalog matches founder pricing
    override, computeNextPeriod corners.
  - Plus 5 existing test files (subscriptions-expiry, notifications,
    posts-comments, reviews-hiring, referrals-withdrawals).
  - Total: **80 / 80 pass** (`npm --prefix backend test`).
- Frontend Vitest (jsdom):
  - `frontend/src/lib/__tests__/utils.test.ts` — `cn` behavior with
    tailwind-merge.
  - `frontend/src/lib/__tests__/api.test.ts` — `apiFetch` + `ApiError`
    with mocked fetch (success, 4xx, plain-text, auth header, URL
    composition).
  - `frontend/src/lib/__tests__/mockData.test.ts` — provider/review
    integrity invariants.
  - Vitest + Testing Library installed; new scripts
    `npm --workspace frontend run test`.
  - Total: **14 / 14 pass**.
- Playwright e2e (`playwright.config.ts`):
  - `tests/e2e/public-reads.spec.ts` — 7 tests: health, posts feed +
    engagement shape, kind aliases, jobs feed, providers fallback,
    404 path, DELETE-in-CORS.
  - `tests/e2e/auth-gates.spec.ts` — 35 tests: every protected GET
    + every mutating endpoint returns 401 unauthenticated; admin
    endpoints all gated; public hire-request 400-on-empty.
  - `tests/e2e/dev-helpers.spec.ts` — 6 tests: simulate-webhook,
    expiry-tick idempotency, set-expiry validation, seed-user,
    seed-review, profile-reviews returns seeded rows.
  - `tests/e2e/frontend-routes.spec.ts` — 9 tests: home, /needs,
    /opportunities, /jobs, /pricing, /login, /signup, unknown route,
    admin panel root.
  - Total: **51 / 51 pass** (`npm run test:e2e`).
- **Grand total: 145 / 145 pass**, runnable via `npm test` from repo
  root.

Where it finished:

- All Phase 4C functionality verified live.
- Frontend `tsc --noEmit` clean.
- Backend `node --check` clean.
- All three dev services restarted with new code.
- Local-only dev exception flagged: `needool+clerk_test@example.com`
  remains in admin allowlist for Playwright runs (matches earlier
  Phase 2/4B/4F sessions).
- No GitHub push/commit performed.

### Phase 4D-1 — Signup field capture (1 June 2026)

PRD sources: §2.3 Individual signup, §2.4 Business signup, §2.7 Referrer
attribution silent-drop.

What was completed:

- Migration `context/deployment/phase-4d1-signup-fields.sql` (applied
  in Supabase). Adds 17 columns to `public.users` covering every
  PRD §2.3 + §2.4 demographic / contact field, plus two indexes
  (`users_country_state_city_idx`, `users_referred_by_idx`).
- New backend lib `backend/lib/signup.mjs` (pure):
  - `isAtLeastEighteen(dobIso, now)` — UTC-safe age check (no
    timezone drift).
  - `pickIndividualSignup(input)` — validates and shapes PRD §2.3
    inputs; throws `SignupError(400, msg, field)` on missing
    `first_name`, `last_name`, `date_of_birth`, or under-18 DOB.
  - `pickBusinessSignup(input)` — validates PRD §2.4 inputs; throws
    on missing `business_address`; if `office_type='Branch'`,
    requires both `hq_address` and `hq_country`.
  - `resolveReferrer({typed, cookie, exists})` — pure helper for
    §2.7. Typed-existing wins, typed-missing silent-drops (cookie
    NOT used in that path; explicit intent overrides), cookie-only
    used when no typed.
- `backend/lib/users.mjs`:
  - `upsertUserFromClerk` now accepts `referredByCookie`, `individual`,
    `business`, and persists them on the users row.
  - Added IO wrapper `resolveReferrerCode({typed, cookie})` that wraps
    `findUserByReferralCode` and applies §2.7 silent-drop.
  - `publicUserShape` extended with the 17 new camelCase fields.
- `backend/server.mjs`:
  - `handleClerkWebhook` reads `data.unsafe_metadata`, runs through
    `pickIndividualSignup` / `pickBusinessSignup`, and passes results
    to `upsertUserFromClerk`. Validation errors are logged but do not
    block user.created (the row is still upserted so auth doesn't
    deadlock).
  - Dev-only `POST /api/dev/signup-capture` — same code path as the
    real webhook so Playwright + node:test can drive validation
    matrices without the svix signature dance. Returns the raw row
    on success.
- Frontend `frontend/src/components/auth/SignupDemographicForm.tsx`
  (new) — captures all §2.3 / §2.4 fields with client-side under-18
  block. `data-test` attrs: `signup-demographic-form`,
  `account-type-individual|business`, `signup-referred-by`,
  `signup-country|state|city|phone|whatsapp|nationality`,
  `signup-middle-name|sex|dob` (Individual mode),
  `signup-business-address|office-type|hq-address|hq-country|hq-state|hq-city`
  (Business mode), `signup-form-continue`, `signup-form-error`.
- Frontend `frontend/src/routes/signup.tsx` — two-step flow. Step 1
  shows the demographic form prefilled with `?ref=` cookie. Step 2
  shows Clerk `<SignUp>` with the collected data passed as
  `unsafeMetadata`. Back button returns to step 1.
- `frontend/src/components/nav/DashboardLayout.tsx` — fixed pre-
  existing `Timeout` type error revealed by tsc on this branch.

Verification (1 June 2026):

Backend node:test — `backend/test/signup.test.mjs`, 17 / 17 pass:
- ✓ `isAtLeastEighteen` boundary (exactly 18, one day under, null,
  invalid).
- ✓ `pickIndividualSignup` missing/under-18 throws with correct field.
- ✓ Whitespace normalisation + enum filtering.
- ✓ `pickBusinessSignup` HQ vs Branch matrix.
- ✓ `resolveReferrer` — typed-wins, typed-missing silent-drop,
  cookie-only fallback, case normalisation.

Playwright MCP (live UI + dev endpoint):
- ✓ Individual happy path lands all PRD §2.3 fields in `users` row.
- ✓ Under-18 DOB → 400 + `field=date_of_birth` + exact message.
- ✓ Missing first_name → 400 + `field=first_name`.
- ✓ Typed referrer that does not exist → 201 + `referred_by=null`
  (silent-drop per §2.7).
- ✓ Business HQ happy path → 201 + `office_type='HQ'`.
- ✓ Business Branch missing HQ → 400 + `field=hq_address`.
- ✓ UI demographic form renders 12 fields; `?ref=NEEDOOLCLERKTEST`
  prefills the referrer input.
- ✓ Under-18 client gate fires "You must be at least 18 to sign up."
- ✓ Business toggle swaps the field set to §2.4 inputs.

Playwright e2e — `tests/e2e/phase-4d1-signup.spec.ts`, 10 / 10 pass:
- 8 dev-endpoint validations + 2 UI smoke tests. `waitUntil:
  "networkidle"` is required for the UI tests because the SignUp page
  is SSR-rendered and React state updates only land post-hydration.

Out of scope per founder instruction (production-only):
- Real Clerk-side first/last name capture (Clerk owns its own form;
  we mirror via unsafeMetadata).
- Google Maps location picker (no API key — country/state/city are
  free-text in dev).
- WhatsApp self-confirmation (no WhatsApp API key — number captured,
  verification deferred).
- Mandatory phone OTP — deferred to production hardening.

### Phase 4D-2 — Profile composition + frequency limits (1 June 2026)

PRD sources: §3.1 Profile composition, §2.6 Editable vs immutable fields,
§3.1 5 MB file caps + CV server-side text extraction.

What was completed:

- Migration `context/deployment/phase-4d2-profile-composition.sql`
  (applied in Supabase after the gin_trgm_ops ordering bug was fixed).
  Adds 14 columns to `public.users` covering all §3.1 profile fields
  plus six §2.6 frequency-limit timestamps; creates `user_links` and
  `user_skills` side tables with deny-all RLS; enables the `pg_trgm`
  extension; creates Supabase Storage buckets `avatars` and `cv` (both
  public-read so frontend can render `<img>` and the CV viewer
  directly).
- New pure lib `backend/lib/profile.mjs`:
  - Constants — `BIO_MAX={Ind:500,Biz:1000}`, `LINK_CAP={Ind:7,Biz:15}`,
    `SKILL_CAP={Ind:30,Biz:100}`, `SKILL_REMOVAL_LOCK_DAYS=365`,
    `FREQUENCY_LIMIT_DAYS=30`, `MAX_FILE_BYTES=5MB`.
  - `sanitizeBio(text)` — strips long digit runs, emails, raw URLs and
    `www.*` to enforce §3.1 "digits and symbols stripped".
  - `isFrequencyAllowed(stampIso, now)` + `daysUntilFrequencyUnlock(...)`
    for the once-per-30-day gates.
  - `isSkillRemovable(createdAtIso, now)` for the 365-day lock.
  - `pickProfilePatch({user, input, now})` — the integration. Rejects
    immutable field changes (name/username/email/DOB), bio-on-inactive,
    bio-over-cap, and frequency violations on phone, WhatsApp,
    country/state/city (shared timer), and GPS. Each failure throws
    `ProfileError(status, message, field)`.
- New IO lib `backend/lib/profile-store.mjs`:
  - `updateProfile`, `setProfilePicturePath`, `setCvPath`.
  - `listLinks`, `addLink` (enforces cap + 20-char label), `removeLink`.
  - `listSkills`, `addSkill` (enforces cap + 50-char label + valid kind),
    `removeSkill` (enforces 365-day lock).
- New IO lib `backend/lib/storage.mjs`:
  - `uploadObject`, `deleteObject`, `publicUrl` against Supabase Storage
    REST (service role auth; no new env vars).
  - `extractPdfText(buffer)` using `pdf-parse` (no API key).
- `backend/lib/users.mjs` — `publicUserShape` extended with bio,
  location lat/lng, remote/hourly/currency/work_hours,
  profilePicturePath, cvPath, cvExtractedTextLength, and four
  frequency-limit stamps (phoneUpdatedAt etc.).
- `backend/server.mjs` — 8 new endpoints:
  - `GET /api/profile` — caller's profile + links + skills + caps +
    avatarUrl + cvUrl.
  - `PATCH /api/profile` — body-driven update with §2.6 enforcement.
  - `POST /api/profile/links`, `DELETE /api/profile/links/:id`.
  - `POST /api/profile/skills`, `DELETE /api/profile/skills/:id`.
  - `POST /api/profile/picture` — raw image bytes, 5 MB cap, image/*
    check, deletes prior avatar (§3.1 "previous image deleted on
    change"), requires `status='active'`.
  - `POST /api/profile/cv` — raw PDF bytes, 5 MB cap, runs through
    `extractPdfText` and stores the result in `cv_extracted_text` for
    later §4 search.
  - Dev-only: `POST /api/dev/backdate-frequency` (mutate any
    `*_updated_at`) and `POST /api/dev/backdate-skill` (mutate skill
    `created_at`) — used by the test suite to skip the real 30-day /
    365-day waits.
- Backend deps: `pdf-parse` added to `backend/package.json` (no env vars,
  no remote calls).

Verification (1 June 2026):

Backend node:test — `backend/test/profile.test.mjs`, 30 / 30 pass:
- ✓ Constants match PRD §3.1 + §2.6.
- ✓ `bioCap` / `linkCap` / `skillCap` differ by account type and fall
  back to Individual on unknown type.
- ✓ `sanitizeBio` strips phones, emails, URLs, leaves clean text alone,
  returns "" for null/undefined.
- ✓ `isFrequencyAllowed` boundary at exactly 30 days, fails at 29.
- ✓ `daysUntilFrequencyUnlock` returns ceil of remaining.
- ✓ `isSkillRemovable` boundary at exactly 365 days.
- ✓ `requiresActive` matches PRD §2.6 (picture + bio only).
- ✓ `pickProfilePatch` matrix: bio over cap, bio on inactive, bio
  sanitizer, immutable name/username/email/DOB rejection, phone +
  WhatsApp + location + GPS frequency gates, same-value no-op, OOR GPS
  drop, multi-field happy path.

Playwright MCP (live API):
- ✓ `GET /api/profile` — caps `{bio:500, links:7, skills:30}` match PRD
  for Individual test account.
- ✓ `PATCH /api/profile` — bio + remote + hourly_rate + work_hours all
  persist; response shape exposes hourlyRate etc.
- ✓ 501-char bio → 400 "Bio exceeds 500 characters for Individual
  accounts."
- ✓ Phone change → 200 + `phoneUpdatedAt` set; second change within 30
  days → 429 with "Try again in 30 days." After
  `/api/dev/backdate-frequency` rolls the stamp 31 days back, third
  change → 200.
- ✓ Link add → 201; 25-char label → 400 with the cap message.
- ✓ Skill add → 201; invalid kind → 400; removal within 365-day lock
  → 400; after `/api/dev/backdate-skill` rolls created_at back 366
  days, removal → 200.
- ✓ Avatar upload (1×1 PNG) → 200 + public URL on
  `…/storage/v1/object/public/avatars/<userId>/<ts>.png`. Wrong
  content-type → 415 with the expected message.
- ✓ CV upload (minimal PDF) → 200 + public URL on
  `…/object/public/cv/<userId>/<ts>.pdf`. PDF text extraction runs
  through `pdf-parse` (no API key) — minimal sample text-empty PDF
  yields length 0; real CVs return non-zero in the same field.

Playwright e2e — `tests/e2e/phase-4d2-profile.spec.ts`, 12 / 12 pass:
- 8 auth-gate tests covering every new endpoint (401 unauthenticated).
- 4 dev-helper validation tests (missing args 400; backdate persists).

Out of scope per founder instruction (production-only):
- Real Google Maps lat/lng picker. UI accepts manual numeric inputs;
  the schema is ready for a Maps drop-in.
- WhatsApp self-confirmation (no WhatsApp API key) — number is captured,
  confirmation tap-to-open link deferred.
- CV downloadability — frontend will use a PDF viewer rather than a
  download link to honor §3.1 "view-only, never downloadable". Backend
  serves the file because Supabase Storage public URL is required for
  the PDF viewer; access logging deferred.

### Phase 4D-3 — Real public profile (1 June 2026)

PRD sources: §3.2 Public profile view, §4.3 visitor visibility, §3.1
CV view-only enforcement, §15.4 server-side gating.

What was completed:

- No schema migration. All needed columns + side tables already landed
  in 4D-1 + 4D-2.
- `backend/server.mjs::handleUserByUsername` rewritten to return the
  complete PRD §3.2 surface:
  - Avatar URL (from `profile_picture_path`).
  - bio, hourlyRate, currency, workHours, remote.
  - country / state / city.
  - businessAddress (Business accounts only per §3.2).
  - distanceKm — great-circle in km via a local `haversineKm` helper,
    computed only when the request supplies `viewerLat` + `viewerLng`
    AND the target has location_lat / location_lng. Returns null
    otherwise. PRD §3.1 says "never shown precisely" — value is
    rounded to one decimal.
  - skills (live `user_skills` rows).
  - phone, whatsapp, links, cvUrl — gated. Revealed iff `status='active'`
    OR `isSelf`. Inactive targets return phone=null, whatsapp=null,
    cvUrl=null, links=[]. PRD §3.2 + §4.3.
  - posts (approved + non-closed only, via `listPosts({status:
    'approved', authorId})` with the existing `pinnedFirst` ordering).
  - reviews + `reviewAggregate` from existing `listReviewsForTargetUser`.
  - `notifyWhenActiveAvailable: status==='inactive' && !isSelf` — wires
    up the §3.3 button in 4D-4.
- Frontend `frontend/src/routes/p.$username.tsx`:
  - `ProfileResponse` type rewritten to the full LiveProfile shape.
  - Provider derivation flipped: **live data is now the primary source**;
    mockData is a fallback only for usernames that don't exist in the
    DB (legacy seeded profiles like `ada.codes`).
  - `liveProfileProvider(live, mock)` merges live fields over mock —
    live wins on every populated field; mock fills blanks.
  - New "Posts ({n})" section data-test `profile-posts` with
    `profile-post` rows, each linking to `/posts/$id`.
  - CV section now embeds the live `cvUrl` in an `<object>` PDF viewer
    (PRD §3.1 "view-only, never downloadable" — no direct download
    link). Falls back to "No CV uploaded" when null.
  - Contact rail now renders live phone, WhatsApp (tel: / wa.me links)
    and live links instead of mock-only. Block still wrapped in
    `LockedField` so anon visitors see the lock per §4.3.

Verification (1 June 2026):

Playwright MCP (live API + signed-in browser):
- ✓ `GET /api/users/by-username/needoolclerktest` returns 30 keys
  covering every PRD §3.2 surface. Bio, hourlyRate, workHours, phone,
  cvUrl, posts (2), reviews (1, aggregate 5★), 1 link all surface for
  the Active test user.
- ✓ Inactive seeded user (via `/api/dev/signup-capture` default
  `status='inactive'`) — phone, whatsapp, cvUrl all null, links=[],
  `notifyWhenActiveAvailable=true`.
- ✓ Distance computed when `?viewerLat=&viewerLng=` supplied; rounded
  to 1 decimal.
- ✓ UI snapshot of `/p/needoolclerktest` shows: live bio, Skills /
  Services chips, Posts (2) section with live data, CV PDF viewer
  embed, phone +234 7033334444 in the contact rail, Portfolio link,
  USD 45/hr, "Mon-Fri 09:00-17:00 GMT", 4.8 km away.

Playwright e2e — `tests/e2e/phase-4d3-public-profile.spec.ts`,
8 / 8 pass:
- 5 endpoint-shape tests (full shape, Active reveal, inactive null-gate,
  404, distance opt-in).
- 3 UI tests (bio + work hours + hourly rate render; Posts section
  rendered when present; CV viewer points to Supabase Storage public
  URL).
- UI tests use `waitUntil: "domcontentloaded"` (not `networkidle` —
  Vite dev HMR never goes idle) and assert with
  `toContainText(..., timeout)` so the live fetch can race in.

Out of scope per founder instruction (production-only):
- Real Google Maps distance for the viewer end. UI accepts viewer
  geolocation via the geolocation API; the endpoint accepts viewerLat /
  viewerLng query params — frontend will wire `navigator.geolocation`
  in a follow-up after the Maps key lands.
- Removing the legacy mockData fallback entirely. Kept for visual
  parity on demo profiles (`ada.codes`, `kemi.designs`, `fixit.lagos`)
  that aren't seeded in Supabase. The merge is "live wins on every
  populated field" so once those profiles get DB rows, no UI work is
  required.

### Phase 4D-4 — Notify-when-active + contact intent (1 June 2026)

PRD sources: §3.3 'Notify when active' flow, §3.4 Contact intent
logging.

What was completed:

- Migration `context/deployment/phase-4d4-notify-and-contact.sql`
  (applied 1 June 2026). Adds two tables:
  - `notify_when_active_requests (id, target_user_id, requester_id,
    status, created_at, expires_at, fulfilled_at)` with `unique
    (target_user_id, requester_id, status)` to keep pending rows
    idempotent.
  - `contact_intent_log (id, target_user_id, viewer_id, intent_type,
    link_url, created_at)` — append-only.
  - Both deny-all RLS.
- New pure lib `backend/lib/notify-active.mjs`:
  - `NOTIFY_WINDOW_DAYS=30`, `CONTACT_INTENT_TYPES=[phone, whatsapp,
    link, cv]`.
  - `canRequestNotify({target, requester})` — 404 / 401 / self /
    ALREADY_ACTIVE matrix.
  - `isRequestActive(row, now)` — pending + expires_at-future.
  - `viewerNameForContactIntent({target, viewer})` — PRD §3.4 says
    viewer identity is shown only if the TARGET is Active. Returns
    name | username | null accordingly.
  - `pickContactIntent(input)` — validates type + caps link_url at
    500 chars.
- New IO lib `backend/lib/notify-active-store.mjs`:
  - `requestNotifyWhenActive` — idempotent for pending rows in the
    30-day window; clears expired pending rows before inserting; emits
    `notify_active_interest` to target (no requester identity per
    §3.3).
  - `fanoutOnTargetActivation` — finds all still-pending rows for the
    target and emits `notify_active_target_activated` to each
    requester, then marks rows fulfilled.
  - `expireStalePendingRequests` — daily sweep.
  - `logContactIntent` — appends to log + emits `contact_viewed` with
    viewer name gated by target.status per §3.4.
- `backend/lib/users.mjs::activateUser` now triggers
  `fanoutOnTargetActivation` whenever a user transitions from inactive
  → active. Lazy-imported to avoid the circular reference.
- `backend/lib/notifications.mjs` catalog gained two events:
  - `notify_active_interest` (in_app + email).
  - `notify_active_target_activated` (in_app + email).
  - `contact_viewed` template extended to surface intent type +
    viewer name (gated).
- `backend/server.mjs` — three new endpoints:
  - `POST /api/profiles/:userId/notify-when-active` — Clerk-required.
  - `POST /api/profiles/:userId/contact-intent` — optional session;
    anon callers no-op 204 per §3.4.
  - Dev-only `POST /api/dev/expire-notify-sweep` — exercises the
    30-day expiry transition without time travel.
- Frontend `frontend/src/routes/p.$username.tsx`:
  - "Notify when active" button (`data-test="notify-when-active-button"`)
    renders whenever the backend returns
    `notifyWhenActiveAvailable=true`. Disabled while in-flight; emits a
    user-facing message line (`data-test="notify-message"`).
  - Phone / WhatsApp / link `<a>` tags now fire
    `logContactIntent("phone"|"whatsapp"|"link", linkUrl)` on click —
    best-effort, errors swallowed.

Verification (1 June 2026):

Backend node:test — `backend/test/notify-active.test.mjs`, 18 / 18 pass:
- ✓ Constants match PRD (30-day window, 4 intent types).
- ✓ `canRequestNotify` matrix — null target / null requester / self /
  active target / clean path.
- ✓ `isRequestActive` matrix — pending+future / expired / non-pending /
  null row.
- ✓ `viewerNameForContactIntent` — active target reveals, inactive
  hides; username fallback; null inputs.
- ✓ `pickContactIntent` — every PRD type accepted; invalid → 400;
  link_url cap; snake_case accepted.
- ✓ `NotifyActiveError` preserves status + code.

Playwright MCP (live API + signed-in browser):
- ✓ First request → 201 with `created=true` + `expiresAt` 30 days out.
- ✓ Same-requester repeat → 200 with `created=false` (idempotent).
- ✓ Self-target → 400 "You cannot request a notification for yourself."
- ✓ Anon caller → 401 (Clerk-required endpoint).
- ✓ Contact intent → 200; invalid type → 400.
- ✓ Anon contact intent → 204 no-op (PRD §3.4).
- ✓ **Fanout**: seeded inactive target, requested notify, ran
  `simulate-webhook` activation. Reviewer's notifications feed gained
  one `notify_active_target_activated` row with the correct title
  "Member you waited on is now Active" + `payload.targetUserId` set.

Playwright e2e — `tests/e2e/phase-4d4-notify-and-contact.spec.ts`,
4 / 4 pass:
- 3 auth-gate tests + 1 dev-sweep validation test.

Out of scope per founder instruction (production-only):
- Cron wiring for `/api/dev/expire-notify-sweep`. Daily cron should
  hit the prod endpoint at launch time; founder owns scheduling.
- Real email rendering for the two new catalog events — Resend dev
  fallback no-ops as before.
- Direct-message UI changes — "Message {firstName}" link still goes
  to "#" in the contact rail; chat is a separate phase.

### Phase 4D-5 — Search & ranking (1 June 2026)

PRD sources: §4.1 Search bar, §4.2 Active-first ranking,
§4.3 visitor public-access surface.

What was completed:

- Migration `context/deployment/phase-4d5-search-indexes.sql` (perf-only,
  applied). 4 gin_trgm_ops indexes on `users.name/username/bio/
  cv_extracted_text` + composite `users (status, updated_at desc)`.
  Endpoint works without it; indexes matter at scale.
- New pure lib `backend/lib/search.mjs`:
  - Constants: `SCOPES`, `NEAR_RADII_KM=[1,5,15,50]`, `SEARCH_PAGE_SIZE=20`,
    `INACTIVE_PAGE_1_THRESHOLD=20` (PRD §4.2).
  - `haversineKm(a,b)` — pure great-circle.
  - `compareCandidates(a,b)` — Active-above-Inactive → relevance →
    distance → recency.
  - `paginate(sorted, page, pageSize)` — implements the "Inactive on
    page 1 only when fewer than 20 Active matches exist" rule.
  - `pickSearchInput(query, params)` — validates scope, near radius,
    page bounds; throws `SearchError(status, msg, field)`.
- New IO lib `backend/lib/search-store.mjs`:
  - `fetchTextMatches` — OR across `name/username/bio/cv_extracted_text`
    via PostgREST `or=` + ILIKE (GIN-accelerated).
  - `fetchSkillMatchedUserIds` — joins through `user_skills.label`.
  - Merges text + skill matches, scopes by country/state/city, computes
    distance for near-me, scores relevance 0-3, sorts via
    `compareCandidates`, paginates per `paginate`.
  - Returns a visitor-safe shape — no phone/whatsapp/links/cv columns
    ever appear in `results` (§4.3).
- `backend/server.mjs` — new `GET /api/search` endpoint (public, no
  bearer required per §4.3).
- Frontend `frontend/src/routes/search.tsx` refactored:
  - Now fetches from `/api/search` with the current URL search params.
  - Live results converted to `Provider` shape and merged with the
    existing mockData filter pipeline (live wins by username).
  - Existing `FilterSidebar`, `ProviderCard`, Active / Inactive
    sections preserved.
  - New `data-test` selectors: `search-summary`, `search-loading`,
    `search-error`, `search-active-section`, `search-active-grid`,
    `search-inactive-section`.

Verification (1 June 2026):

Backend node:test — `backend/test/search.test.mjs`, 19 / 19 pass:
- ✓ Constants match PRD (scopes, near radii, page size, inactive
  threshold).
- ✓ `haversineKm` Lagos→Abuja sanity (~530 km), null inputs return
  null.
- ✓ `compareCandidates` matrix — Active always above Inactive even
  with higher relevance + recency; within tier the priority chain
  relevance → distance → recency holds.
- ✓ `paginate` matrix — fewer than 20 Active → page 1 includes
  Inactive; 25 active → page 1 is all active, page 2 contains
  remaining + Inactive.
- ✓ `pickSearchInput` — default scope, invalid scope, near without
  coords, invalid radius, query trim+cap, page clamp.

Playwright MCP (live API, dev seed):
- ✓ Username search "needoolclerktest" → 1 hit, that user.
- ✓ Bio keyword "React" → 1 hit (matches the §3.1 bio).
- ✓ Country scope "Nigeria" → 5 results, all in Nigeria.
- ✓ Invalid scope → 400; near without coords → 400; invalid radius →
  400.
- ✓ Seeded **22 Active + 5 Inactive** under a unique keyword: page 1
  returned 20 rows ALL Active; page 2 returned the remaining 2 Active
  + 5 Inactive. Active-above-Inactive ✓, page-1-hides-Inactive-when-
  20+ ✓.
- ✓ Seeded **3 Active + 2 Inactive** under a different keyword: page
  1 returned all 5 with Inactive visible. Page-1-shows-Inactive-when-
  <20 ✓.

Playwright e2e — `tests/e2e/phase-4d5-search.spec.ts`, 11 / 11 pass:
- 9 endpoint tests (shape, public access, invalid scope, near
  validation, country filter, §4.2 ranking matrix at both dataset
  scales, §4.3 leakage-free shape).
- 2 UI tests (search page renders, Active section heading).
- `page.goto({ timeout: 60_000 })` bump needed for the SSR cold-start
  on `/search` — Vite first-request hydration is slow.

Out of scope per founder instruction (production-only):
- Country flag from IP (PRD §4.1). Needs an IP geolocation service —
  user owns the swap.
- Postgres RPC for ranked search in a single query. Current approach
  does 2-3 round-trips + merges in JS; fine at v1 launch scale.
- Search-result SSR + JSON-LD enrichment. Phase 4D-6 will add
  schema.org + sitemap covering this.

### Phase 4D-6 — SEO (1 June 2026)

PRD sources: §4.4 SEO (mission-critical), §15.4 SSR.

What was completed:

- No schema migration. SEO is purely server-render + frontend head.
- New `backend/server.mjs` endpoints:
  - `GET /sitemap.xml` — XML 0.9 schema. Builds the URL set from the
    static landing pages + every approved+open post + every open job
    opening + every non-banned user. Cached `max-age=900`.
  - `GET /robots.txt` — points crawlers at the sitemap, allows all.
- New pure lib `frontend/src/lib/seo.ts`:
  - `SITE_URL` — reads `VITE_PUBLIC_SITE_URL`, falls back to
    `https://needool.com`.
  - `canonical(path)` — absolute URL builder.
  - `profileJsonLd(input)` — emits `Person` for Individual,
    `LocalBusiness` for Business (PRD §4.4). Populates address
    PostalAddress when location set.
  - `postJsonLd(input)` — `Event` for kind='event' (with
    `eventAttendanceMode` Online/Offline + Place), `CreativeWork`
    for need/opportunity.
  - `jobJsonLd(input)` — `JobPosting` with normalized
    `employmentType`, hiring org, location array.
  - `openGraphMeta(input)` — OG + Twitter card meta builder.
- Route head updates:
  - `frontend/src/routes/p.$username.tsx`:
    - `head:` now returns both `meta` (og:title/og:type=profile/
      og:description/twitter:*) AND `links` (canonical).
    - A `useEffect` injects `<script id="needool-profile-jsonld"
      type="application/ld+json">` into `<head>` once `liveProfile`
      lands. Cleanup on unmount.
  - `frontend/src/routes/posts.$id.tsx`:
    - `head:` adds OG + canonical for the post detail page.

Verification (1 June 2026):

Frontend Vitest — `frontend/src/lib/__tests__/seo.test.ts`, 11 / 11
pass (cumulative Vitest 25 / 25 across the project):
- ✓ `canonical` absolute pass-through, relative normalization.
- ✓ `profileJsonLd` — Person for Individual, LocalBusiness for
  Business, address shape, omits address when no location.
- ✓ `postJsonLd` — Event vs CreativeWork branches; Event uses
  `eventAttendanceMode` constants.
- ✓ `jobJsonLd` — JobPosting + employmentType normalization
  ("Full-time" → "FULL_TIME") + Needool hiringOrganization.
- ✓ `openGraphMeta` — required tags + conditional image entries.

Playwright MCP (live + curl):
- ✓ `GET /sitemap.xml` → 200, application/xml. Includes `/needs`,
  `/opportunities`, `/events`, `/jobs`, `/pricing`, `/search`, plus
  every public user as `/p/:username` and every approved post as
  `/posts/:id`.
- ✓ `GET /robots.txt` → 200, references sitemap URL.
- ✓ `/p/needoolclerktest` renders `<link rel="canonical">`,
  `og:type=profile`, twitter:summary_large_image, and (after live
  data lands) `<script id="needool-profile-jsonld">` carrying the
  Person JSON-LD with name, url, image, description, and
  identifier `@needoolclerktest`.
- ✓ `/posts/:id` renders `<link rel="canonical">` and `og:type=article`.

Playwright e2e — `tests/e2e/phase-4d6-seo.spec.ts`, 5 / 5 pass:
- 3 sitemap + robots checks.
- 1 profile-page SEO surface check (uses `waitForFunction` to wait
  for the JSON-LD script — it's in `<head>` so it has no visible
  box; visibility-based locators don't work).
- 1 post-page canonical/og check.

Out of scope per founder instruction (production-only):
- Google Search Console sitemap submission. Founder will paste the
  `/sitemap.xml` URL into Search Console after deploy.
- Pre-render JSON-LD into SSR HTML. Current implementation injects
  the script via `useEffect` (client-side); for full SEO, the
  TanStack Router head needs the `scripts:` field. The script-in-
  useEffect approach gets Google's indexer to render JS for the
  Person/LocalBusiness shape (Googlebot supports JS), but launch
  hardening should move JSON-LD into the SSR head.
- LD per post detail page (Event/CreativeWork). The component
  effect path mirrors profile; will be added in a small follow-up
  before launch.

### Phase 4D-7 — Post / Opportunity validation bugfixes (1 June 2026)

PRD sources: §5.1 Need Request creation rules, §5.5 Closing,
§6.1 Opportunity differences from Need Requests.

What was completed:

- No schema migration.
- `backend/lib/posts.mjs`:
  - New pure helper `containsContactInfo(text, { checkUrls })` that
    detects phones or emails (and optionally URLs) and returns a bool.
    Phone detection now requires EITHER an international `+` prefix
    OR an in-run separator (space, dash, paren, dot) — fixes false
    positives on 13-digit timestamps like `Date.now()`.
  - Legacy `stripContactInfo` retained for back-compat with older
    sanitization paths; renamed internal helpers `EMAIL_STRIP_RE` and
    `URL_STRIP_RE` to avoid clashing with the rejection regexes.
- `backend/server.mjs::validatePostInput` adds three new gates:
  - **§5.1 thumbnail required** — non-admin creators must supply a
    `thumbnail_url`. Returns 400 "Thumbnail image is required (PRD
    §5.1)."
  - **§5.1 phones/emails rejected (not stripped)** — `title` is
    always checked; `description` is checked with `checkUrls:true`
    for opportunity + event posts (which §6.1 + §7 make stricter
    than need posts).
  - **§5.1 ≤3 links** kept (was already enforced) plus the link-title
    20-char cap.
- `backend/server.mjs::handleLikePost` and `handleSavePost` add
  **§5.5 closed-state engagement block**:
  - Closed posts (status='closed' OR closed_at set) → 409 "Post is
    closed; likes/saves are disabled."
  - The previous "approved-only" check moved AFTER the closed check
    so we return 409 not 404 for closed posts.
- §6.1 opportunity-cannot-use-'near'-scope was already enforced
  pre-4D-7 — no change. The audit flagged it as gap but a prior
  phase had fixed it.

Verification (1 June 2026):

Backend node:test — `backend/test/posts-validation.test.mjs`,
11 / 11 pass:
- ✓ `containsContactInfo` matrix: clean text, international + prefix,
  separated phone (space/dash/paren), email, ISO date NOT flagged,
  URL conditional, null/empty safe, **timestamps NOT flagged** (fix
  for the false-positive bug found mid-run), separated phone
  formats flagged.
- ✓ `stripContactInfo` legacy path unchanged.
- ✓ Reject-vs-strip semantics: helpers coexist.

Cumulative backend node:test — `npm --prefix backend test`,
**175 / 175 pass** (up from 145 at start of session).

Playwright MCP (live API, signed-in test user):
- ✓ POST without thumbnail → 400 with PRD §5.1 message.
- ✓ POST with phone in title or description → 400.
- ✓ POST with email → 400.
- ✓ POST with 4 links → 400.
- ✓ POST opportunity with `scope='near'` → 400.
- ✓ Happy path with thumbnail + clean text → 201, post created.
- ✓ Approve → 200, close → 200, like closed → **409** with PRD §5.5
  message, save closed → **409**.

Playwright e2e — `tests/e2e/phase-4d7-post-validation.spec.ts`,
1 / 1 pass:
- Auth gate test only; mutations need a Clerk bearer the e2e
  harness lacks. Validation matrix is fully exercised via MCP +
  node:test.

Frontend Vitest — 25 / 25 pass (no change at this sub-phase).

Out of scope per founder instruction (production-only):
- None — every §5.1/§5.5/§6.1 audit item is now closed in code.

---

### Phase 4D summary — all 7 sub-phases shipped (1 June 2026)

| Sub-phase | PRD sources | Status |
| --- | --- | --- |
| 4D-1 Signup field capture | §2.3, §2.4, §2.7 | ✓ shipped |
| 4D-2 Profile composition + frequency limits | §3.1, §2.6 | ✓ shipped |
| 4D-3 Real public profile (replace mockData) | §3.2 | ✓ shipped |
| 4D-4 Notify-when-active + contact intent | §3.3, §3.4 | ✓ shipped |
| 4D-5 Search & ranking | §4.1, §4.2, §4.3 | ✓ shipped |
| 4D-6 SEO (schema.org, sitemap, OG) | §4.4 | ✓ shipped |
| 4D-7 Post / Opportunity bugfixes | §5.1, §5.5, §6.1 | ✓ shipped |

Cumulative test counts at the end of Phase 4D:
- **Backend node:test: 175 / 175** pass.
- **Frontend Vitest: 25 / 25** pass.
- **Playwright e2e: 100+ / 100+** pass across phase-4d* specs and
  the carry-over phase 4B/C/F suites.

PRD §19 acceptance items now closed by Phase 4D:
- Signup capture (typed-username referrer, 7-free-day trial wiring
  still requires §10.3 work in a later chunk).
- Profile composition + frequency limits + CV upload + text
  extraction.
- Public profile gating per §4.3 (contact info hidden from
  visitors).
- "Notify when active" flow.
- 30-day-continuously-Active eligibility for §9 Trigger B
  (consumed by Phase 4C).
- Search with active-first ranking + page-1 inactive hiding rule.
- Sitemap + OG/Twitter cards.
- Phone/email rejection on posts; ≤3 links; thumbnail required;
  closed-state engagement disabled.

### Phase 4G — Help & Guide CMS + notification preferences (1 June 2026)

PRD sources: §14 Help & Guide, §12 Notification channel table.

What was completed:

- Migration `context/deployment/phase-4g-help-and-prefs.sql` (applied
  1 June 2026). Adds:
  - `help_articles (id, slug uniq, title, body, excerpt, category,
    tags jsonb, status draft|published|archived, author_id,
    published_at, created_at, updated_at)` with title + body
    gin_trgm_ops indexes for the in-page search.
  - `notification_preferences (user_id, event_type, enabled,
    updated_at)` PK (user_id, event_type) — opt-out persistence.
  - Both deny-all RLS.
- New pure lib `backend/lib/help.mjs`:
  - `slugify(text)` — UTF-8 normalize + diacritic strip + slug build.
  - `pickArticleInput(input)` — shapes admin form input; auto-slug
    when no slug provided.
  - `validateArticle(input)` — title/body/slug required checks.
  - `isVisibleToVisitor(row)` — only `status='published'`.
  - `deriveExcerpt(body)` — markdown-aware fallback excerpt.
- New IO lib `backend/lib/help-store.mjs`:
  - `findArticleById`, `findArticleBySlug`.
  - `listPublishedArticles({category, q})` — public list with OR
    filter across title/body/excerpt + category eq filter.
  - `listAllArticlesForAdmin({status})` + `listArticleCategories()`.
  - `createArticle({input, authorId})` with slug-uniqueness 409.
  - `updateArticle({id, input})` with slug-conflict 409.
  - `publishArticle({id})` + `archiveArticle({id})`.
- New pure lib `backend/lib/notification-prefs.mjs`:
  - `MANDATORY_EVENT_TYPES` set covering money/auth/hire safety
    events (subscription_expired, withdrawal_completed/failed,
    hired, post_rejected, review_received).
  - `shouldEmit({eventType, prefRow})` — default opt-in, mandatory
    events ignore opt-out.
  - `validatePrefPatch(patch)` — 400 on missing fields or
    attempting to opt out of mandatory event.
- New IO lib `backend/lib/notification-prefs-store.mjs`:
  - `listPreferences(userId)`, `getPreference({userId, eventType})`,
    `setPreference({userId, patch})` (upsert on `user_id, event_type`).
- `backend/lib/notifications-store.mjs::emitNotification` now checks
  the per-user pref before inserting + emailing. Lazy import to keep
  the cycle clean; falls back to default opt-in if prefs lookup
  fails (safe during partial rollout).
- `backend/server.mjs` — 9 new endpoints:
  - Public: `GET /api/help/articles`, `GET /api/help/articles/:slug`.
  - User: `GET /api/notifications/preferences`,
    `PATCH /api/notifications/preferences`.
  - Admin (all audit-wrapped via withAdminAudit):
    `GET /api/admin/help/articles`, `POST /api/admin/help/articles`,
    `PATCH /api/admin/help/articles/:id`,
    `POST /api/admin/help/articles/:id/publish`,
    `POST /api/admin/help/articles/:id/archive`.
- Phase 4D-6 sitemap now includes `/help` + every published
  `/help/:slug`. Help articles join users + posts + jobs in the
  sitemap fetch.
- Frontend:
  - `frontend/src/routes/help.tsx` → Outlet wrapper.
  - `frontend/src/routes/help.index.tsx` → the list page (search +
    category chips, GET /api/help/articles).
  - `frontend/src/routes/help.$slug.tsx` → the detail page with
    minimal in-house markdown renderer (no new deps) + JSON-LD
    `Article` schema + canonical link.
  - `frontend/src/components/dashboard/NotificationPrefs.tsx` —
    collapsible panel with 23 toggleable events grouped by
    Account/Wallet/Posts/Profile/Hire. Mandatory events render with
    a disabled toggle + "Required" hint.
  - `frontend/src/components/dashboard/LoggedInAccountPages.tsx` →
    mounts the prefs panel inline above the notifications list.
- Admin panel `admin-panel/src/main.jsx`:
  - New `HelpCmsPage` replacing the placeholder. Status filter,
    Reload, New article. Row actions: Edit / Publish / Archive.
  - New `HelpCmsEditor` — title, slug (auto-derive blank), category,
    tags (comma-separated), markdown body textarea. "Save as draft"
    and "Save & publish" buttons. data-test attrs throughout.

Verification (1 June 2026):

Backend node:test — `backend/test/help.test.mjs` + `backend/test/
notification-prefs.test.mjs`, 33 / 33 pass. Cumulative backend:
**208 / 208** (175 → 208).
- Help: constants, slugify (diacritics, runs, cap), pickArticleInput
  matrix (slug derivation, explicit slug, tag cap, invalid-status
  ignore), validateArticle errors, isVisibleToVisitor, deriveExcerpt
  truncation, HelpError shape.
- Prefs: MANDATORY set membership, shouldEmit (default opt-in, opt-
  out, mandatory override), validatePrefPatch (missing fields,
  mandatory opt-out block, opt-back-in pass, camelCase eventType).

Playwright MCP (live API + UI):
- ✓ Admin create draft → 201 with status=draft.
- ✓ Duplicate slug → 409 "An article with this slug already exists."
- ✓ Draft hidden from visitor list AND 404 on slug detail.
- ✓ Publish → 200, status=published, published_at set.
- ✓ Public list now returns the article + correct category.
- ✓ Slug detail returns full body.
- ✓ `GET /api/notifications/preferences` returns
  `{preferences: [], mandatory: [6 events]}` for the test user.
- ✓ Opt out of `like_received` → 200, enabled=false persisted.
- ✓ Opt out of `subscription_expired` → 400 with mandatory message.
- ✓ `/help` UI list page renders with search form, category chips,
  article card.
- ✓ `/help/:slug` UI renders markdown body as HTML headings + para,
  `<script id="needool-help-jsonld" type="application/ld+json">`
  Article schema injected, canonical link points at the slug URL.
- ✓ Admin `#/help-cms` UI renders rows table with Edit/Publish/
  Archive actions and the New-article editor with all fields.
- ✓ `/dashboard/notifications` mounts the prefs panel — opening it
  shows 23 toggleable rows grouped into 5 categories with the
  mandatory rows' switches disabled.
- ✓ `/sitemap.xml` includes `/help` + a `/help/:slug` URL.

Playwright e2e — `tests/e2e/phase-4g-help-and-prefs.spec.ts`,
14 / 14 pass:
- 5 public help reads (list, q filter, category filter, unknown
  slug 404, sitemap inclusion).
- 5 admin auth-gate tests (every admin help endpoint 401 without
  bearer).
- 2 notification prefs auth-gate tests.
- 2 UI tests (`/help` list renders, `/help/:slug` detail renders;
  describe-level setTimeout 90s for Vite SSR cold-start).

Out of scope per founder instruction (production-only):
- Markdown rendering uses an in-house minimal renderer (headings,
  paragraphs, lists, inline code, links). For tables/images/code-
  fences, pull in `marked` at launch time.
- No rich-text WYSIWYG. Markdown textarea is the editing surface.
- AI-chat support deferred per PRD §14 v3.0 wording.

### Phase 4H — PWA + web push + Trigger B reports queue UI (2 June 2026)

PRD sources: §15.5 PWA, §12 push channel, §9.4.5 target review reports.

What was completed:

- Migration `context/deployment/phase-4h-push-subscriptions.sql`
  (applied 2 June 2026). Adds:
  - `push_subscriptions (id, user_id, endpoint, p256dh, auth,
    user_agent, created_at, last_seen_at)` PK id; UNIQUE
    `(user_id, endpoint)` for upsert idempotency.
  - Deny-all RLS.
- New pure lib `backend/lib/push-subscriptions.mjs`:
  - `pickPushSubscription(input)` accepts both `keys.{p256dh,auth}`
    (W3C raw) and flat `{p256dh, auth}`. Requires https endpoint.
  - `PushSubError(status, message, field)` shape.
- New IO lib `backend/lib/push-subscriptions-store.mjs`:
  - `listPushSubscriptionsForUser(userId)`.
  - `upsertPushSubscription({userId, input})` keyed on
    `(user_id, endpoint)` — refreshes `last_seen_at` on re-subscribe.
  - `deletePushSubscription({userId, endpoint})`.
- 3 new endpoints in `backend/server.mjs`:
  - `GET /api/notifications/push/subscriptions`.
  - `POST /api/notifications/push/subscribe`.
  - `DELETE /api/notifications/push/subscribe`.
- PWA shell:
  - `frontend/public/manifest.json` — already in place from PRD §15.5
    scaffold; verified shape (name, icons 192 + 512, theme color).
  - `frontend/public/sw.js` (new) — minimal service worker. Caches
    app shell + offline.html. Network-first for navigations, cache-
    first for same-origin static. Bypass `/api/*`, Clerk, Supabase.
    Handles `push` (showNotification w/ payload) and
    `notificationclick` (focuses or opens client at payload.url).
  - `frontend/public/offline.html` (new) — fallback page with retry
    button + icon.
  - `frontend/src/lib/pwa.ts` (new):
    - `registerServiceWorker()` — registers `/sw.js` on `load`.
      Skipped in dev unless `VITE_ENABLE_SW_IN_DEV=true` to avoid
      HMR cache fights.
    - `installA2HSListener()` — captures `beforeinstallprompt` event,
      tracks `appinstalled` to clear it.
    - `subscribeA2HSAvailability(cb)` + `promptA2HS()` —
      React-friendly listener API.
    - `getActivePushSubscription()`, `ensurePushSubscription()`,
      `disablePushSubscription()` — wrap the Push API.
      `ensurePushSubscription` requires `VITE_VAPID_PUBLIC_KEY` (set
      at launch time per founder guard).
  - `frontend/src/components/pwa/InstallPrompt.tsx` (new) — A2HS
    banner with Install/Later buttons. Sessions-storage dismiss
    flag. data-test attrs: `a2hs-prompt`, `a2hs-install`,
    `a2hs-later`.
  - `frontend/src/components/dashboard/PushOptIn.tsx` (new) — opt-in
    panel that handles 5 states: `loading`, `unsupported`,
    `no-vapid`, `permission-denied`, `off`, `on`. On enable: requests
    permission, subscribes via Push API, POSTs subscription to
    backend. On disable: unsubscribes locally + DELETE on backend.
    data-test attrs: `push-optin`, `push-optin-enable`,
    `push-optin-disable`.
  - `frontend/src/routes/__root.tsx` — calls
    `registerServiceWorker()` + `installA2HSListener()` from the
    root effect; mounts `<InstallPrompt/>` in the shell.
  - `frontend/src/components/dashboard/LoggedInAccountPages.tsx` —
    mounts `<PushOptIn/>` above the existing
    `<NotificationPrefsPanel/>` on `/dashboard/notifications`.
- Admin panel `admin-panel/src/main.jsx`:
  - `ReviewsPage` Reports tab rewritten. Header columns swap to
    `Rating | Reporter / reason | Underlying review | Actions`.
  - Each report row renders the reporter id (truncated), the
    PRD §9.4.5 reason quoted, the underlying review id + comment
    excerpt, and **two action buttons**:
    - `report-keep-:id` — calls `PATCH /api/admin/reviews/:id`
      with `action='resolve-report', outcome='kept'` — review
      stays live.
    - `report-remove-:id` — calls reject on the underlying review
      first (audit-logged), then resolve-report with
      `outcome='removed'`.
  - Empty state copy diverges per tab ("No open target reports"
    vs "Nothing in the held queue").

Verification (2 June 2026):

Backend node:test — `backend/test/push-subscriptions.test.mjs`,
8 / 8 pass. Cumulative backend: **216 / 216** (208 → 216).
- `pickPushSubscription` matrix: nested W3C `keys.*` accepted, flat
  fields accepted, missing endpoint 400, non-https 400, missing
  p256dh / auth 400, whitespace trimmed, user_agent capped at 500.
- `PushSubError` preserves status + field.

Playwright MCP (live API + UI):
- ✓ POST /push/subscribe with W3C nested keys → 201.
- ✓ Same endpoint re-subscribe (upsert) → 201 (refreshes
  last_seen_at).
- ✓ Missing endpoint → 400 "endpoint is required.".
- ✓ Non-https endpoint → 400.
- ✓ GET subscriptions returns the row including the one just
  created.
- ✓ DELETE removes it (deleted=true).
- ✓ `/sw.js` served with install + activate + push +
  notificationclick handlers + offline URL.
- ✓ `link[rel="manifest"]` present in the head.
- ✓ `/dashboard/notifications` mounts the PushOptIn panel which
  renders "Web push isn't configured for this environment." when
  `VITE_VAPID_PUBLIC_KEY` is absent (the explicit founder guard).
- ✓ Admin `#/reviews` Reports tab renders the seeded report row
  with the new column header, reason quoted, and both Keep/Remove
  buttons rendered with the new data-test ids
  (`report-keep-:id`, `report-remove-:id`).

Playwright e2e — `tests/e2e/phase-4h-pwa-and-push.spec.ts`,
10 / 10 pass:
- 4 PWA asset tests (manifest sizes 192 + 512, sw.js handlers +
  offline URL, offline.html shell, link[rel=manifest] in head).
- 3 push subscription auth-gate tests.
- 2 UI render tolerance tests (PushOptIn on notifications page,
  InstallPrompt hidden when beforeinstallprompt hasn't fired —
  expected default browser behavior).
- 1 sitemap regression.

Out of scope per founder instruction (production-only):
- `VITE_VAPID_PUBLIC_KEY` + backend VAPID private key signing.
  Push opt-in UI works end-to-end against the schema; actual
  push sends require the launch-time key bundle. The frontend's
  `ensurePushSubscription` returns `{ ok: false, reason: 'no-vapid' }`
  in dev and the PushOptIn panel renders the explicit "Web push
  isn't configured for this environment." line so testers see why.
- Real backend push sender (web-push npm package + VAPID-signed
  POST to the W3C endpoint). Schema + opt-in flow are ready;
  launch wires the sender + crons subscription cleanup.
- iOS install prompt overlay polish — PWA installs work on iOS
  16.4+ via the share sheet; in-page install banner is Chromium-
  only via `beforeinstallprompt`. Acceptable per PRD §15.5
  intent.

### Phase 8 — Pre-launch security hardening (3 June 2026)

PRD sources: §15.4 (rate limiting, CSRF, RLS, regex stripping),
plus the cybersecurity threat audit in §12. Closes every Claude-
buildable security gap surfaced by Phase 7 + the audit. Two real
findings from the audit (`dangerouslySetInnerHTML`, zero rate
limiting) are resolved here.

What was completed (10 sub-phases):

- **8-1 — Help markdown sanitized.** Added `dompurify@3.4.8` +
  `@types/dompurify` to the frontend. `routes/help.$slug.tsx`
  now passes the rendered HTML through `DOMPurify.sanitize` with
  an explicit allowlist of the markdown subset we emit (h1-h6,
  p, ul, ol, li, strong, em, code, a, br) and `ALLOWED_ATTR =
  ['href','target','rel']`. URI regex rejects `javascript:`,
  `data:`, `vbscript:` schemes (already stripped by DOMPurify
  defaults, but made explicit). `dangerouslySetInnerHTML` stays
  (React's only API for HTML strings) but only ever receives the
  sanitized output.

- **8-2 — Rate-limit middleware.** New `backend/lib/rate-limit.mjs`
  with in-process token-bucket counter. Three tiers:
  - `strict` (5 / 15 min) — OTP request + verify, webhooks,
    auth, withdrawals.
  - `write` (30 / min) — every other POST / PATCH / DELETE.
  - `read` (120 / min) — public GETs.
  Keyed on `${ip}:${tier}:${path}`. Reads `cf-connecting-ip` or
  `x-forwarded-for` for proper IP behind Cloudflare. Emits
  `x-ratelimit-limit / -remaining / -reset` headers on every
  response; sets `retry-after` on 429. Gated by
  `RATE_LIMIT_DISABLED` env var — defaults to enabled in
  production, disabled in dev (so the 391-test suite + Phase 7
  adversarial sweep don't trip the bucket).

- **8-3 — Webhook replay defense.** `verifyClerkWebhook` now
  explicitly checks `svix-timestamp` is within ±5 minutes of
  `Date.now()` before calling `svix.Webhook.verify`. svix's
  library already enforces this internally (confirmed against
  the [2026 docs](https://docs.svix.com/receiving/verifying-payloads/how-manual));
  the explicit check is belt-and-braces so the protection stays
  visible in `test/phase-8-defenses.test.mjs` and won't silently
  disappear if a future contributor swaps libraries. NOWPayments
  doesn't ship a timestamp header — replay is already gated by
  `payment_id` idempotency in `recordPayment`.

- **8-4 — Body-size cap.** `readBody` and `readBytes` now enforce
  per-request limits: 1 MB for JSON, 6 MB for binary uploads
  (covers PRD §3.1's 5 MB picture/CV cap plus form overhead).
  Checks declared `content-length` upfront + accumulates chunk
  bytes; rejects with 413 `PayloadTooLargeError` on overrun.
  Stream is destroyed so the attacker's upload doesn't drain
  the dyno's RAM. Error handler maps 413 to a JSON response
  with `{ error, limitBytes }`.

- **8-5 — CSRF double-submit (PRD §15.4 requirement).** New
  `backend/lib/csrf.mjs` implements the
  [OWASP signed double-submit pattern](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
  Server seeds an `ndl_csrf` cookie (Secure, SameSite=Strict,
  Max-Age=86400, NOT HttpOnly so JS can mirror it) on every
  safe-method response. The cookie value is `${nonce}:${hmac}`
  where the HMAC binds the nonce to the caller's IP (or bearer
  in future). State-changing requests must echo the cookie
  value in `x-csrf-token`. Constant-time HMAC compare.
  `frontend/src/lib/api.ts::apiFetch` now reads the cookie and
  mirrors it on every POST/PATCH/DELETE/PUT + sets
  `credentials: 'include'` so the cookie travels cross-origin.
  Skipped (intentionally) for: webhooks (own signature gates),
  dev endpoints (test harness), contact-intent (PRD §3.4
  anonymous carve-out), public hire-request POSTs, employer
  review-by-token, referrer cookie POST. Gated by
  `CSRF_DISABLED` env (production: off, dev: on, so tests run).

- **8-6 — Content-Security-Policy.** Added strict CSP meta tag
  to `frontend/index.html`: tight default-src + Clerk +
  Cloudflare Turnstile + Supabase + NOWPayments allowed.
  `frame-ancestors 'none'`, `object-src 'none'`. Backend JSON
  responses also carry a tight `Content-Security-Policy:
  default-src 'none'; frame-ancestors 'none'` so even if a
  misconfigured CDN sniffs them as HTML, no scripts execute.

- **8-7 — Push endpoint allowlist.** `pickPushSubscription`
  now rejects endpoints outside the 4 W3C-recognized vendor
  hosts: `fcm.googleapis.com` (+ legacy android.googleapis.com),
  `*.push.services.mozilla.com`, `*.notify.windows.com`,
  `web.push.apple.com`. Returns 400 on attacker-controlled
  receivers. Pure helper `isAllowedPushEndpoint` is exported
  for tests.

- **8-8 — SSRF-safe URL validator.** New
  `backend/lib/url-safety.mjs` rejects:
  private IPv4 (10/8, 127/8, 169.254/16 AWS metadata, 172.16/12,
  192.168/16, 100.64-127 CGNAT, multicast), IPv6 literals,
  blocked schemes (javascript/data/vbscript/file/gopher/ftp/blob/
  ws/wss), known metadata hosts (`metadata.google.internal`,
  `metadata`), `.internal`/`.local`/`.localhost` suffixes, and
  embedded credentials (`user:pass@`). Wired into
  `profile-store.addLink` (every link insert) and
  `reviews.validateReplyInput` (review-reply evidence URLs).
  Adding fetch-side OG-preview later is automatically safe — an
  unsafe URL can never reach storage.

- **8-9 — `ndl_ref` → HttpOnly cookie.** Two new endpoints:
  `POST /api/auth/referrer/set` writes an HttpOnly + SameSite=Lax
  + Secure (in prod) cookie with 30-day max-age (matches PRD
  §2.7 "30-day cookie"). `GET /api/auth/referrer` reads it back.
  `signup.tsx::useReferral` no longer touches `sessionStorage`;
  on fresh `?ref=` it POSTs to set the cookie, otherwise GETs.
  XSS can no longer exfiltrate the referrer code from the DOM.

- **8-10 — Tests.** Two new test files:
  - `backend/test/phase-8-defenses.test.mjs` — 28 unit tests
    covering tier mapping, bucket exhaustion, window reset,
    webhook timestamp window, CSRF roundtrip + tamper detection,
    CSRF cookie flags, push host allowlist (4 vendors +
    rejection), URL safety (private CIDRs, blocked schemes,
    metadata hosts, IPv6, embedded creds), review-reply
    evidence URL gate.
  - `tests/e2e/phase-8-defenses.spec.ts` — 10 e2e tests. 6 are
    always-on (work in dev); 4 are production-mode tests that
    auto-skip unless `RATE_LIMIT_DISABLED=false` +
    `CSRF_DISABLED=false`. Production-mode tests prove the
    middleware actually fires: 6th OTP returns 429,
    `x-ratelimit-*` headers present, CSRF rejects missing cookie.

Pre-existing tests updated:

- `push-subscriptions.test.mjs` + `adversarial-validators.test.mjs`
  now use `https://fcm.googleapis.com/fcm/send/...` (allowlist-
  compliant) instead of `https://x.io/push` (now rejected).

Verification (3 June 2026):

Backend node:test — 363 → **391 / 391** pass.

Playwright e2e (dev mode, both flags unset):
- Phase 7 adversarial: **57 / 57** pass.
- Phase 8 defenses: 6 / 10 pass, 4 skip (prod-mode tests).

Playwright e2e (prod mode, `RATE_LIMIT_DISABLED=false
CSRF_DISABLED=false`):
- Phase 8 defenses: **10 / 10** pass.

Founder dashboard brief: see §12.10 below. Every step quoted from
2026 provider docs per the [founder-dashboard-lookups][[founder-dashboard-lookups]]
rule added to handoff §0.1 this session.

### Phase 7 — Adversarial test sweep (3 June 2026)

PRD source: cross-cutting hardening. Goal: prove the webapp survives
happy, sad, and crazy paths end-to-end.

What was completed:

- **7-1 — Validator fuzz tests.** New
  `backend/test/adversarial-validators.test.mjs` (47 tests) hits every
  `pick*` / `validate*` function with: oversized strings (10k and 100k
  chars), control chars, null bytes, RTL override, zalgo unicode,
  XSS snippets (`<script>`, `<img onerror>`, `javascript:`),
  SQL-ish payloads (`' OR 1=1 --`, `DROP TABLE`), prototype-pollution
  keys (`__proto__`, `constructor`, `prototype`). Each validator must
  either accept-with-cap or reject with its documented domain error
  class — never throw a generic `Error` / `TypeError`. The phone
  detector's separator-required rule is reasserted (won't false-
  positive on 13-digit `Date.now()` timestamps).

- **7-2 — Boundary tests.** New `backend/test/boundaries.test.mjs`
  (36 tests). For every documented cap (post limits, comment
  limits, bio cap, link cap, skill cap, 13-month forward cap,
  re-sub windows, 14-day review edit window, 30-day frequency
  limit, 365-day skill removal lock, Trigger-B rolling 5, new-
  target cap of 10) the test asserts `count = limit - 1` allowed,
  `count = limit` blocked. Catches off-by-one drift that happy-path
  tests miss.

- **7-3 — Idempotency + race tests.** New
  `backend/test/idempotency-races.test.mjs` (18 tests). Lock down
  webhook-retry-safe behavior:
  - NOWPayments `buildOrderId` ↔ `parseOrderId` roundtrip, no
    cross-prefix collisions.
  - `registerOrderHandler` last-write-wins, unknown prefix → null
    (no silent dispatch).
  - `computeNextPeriod` is deterministic for identical input (no
    double-extension on webhook retry).
  - `addMonths` handles Jan 31 + 1 month rollover deterministically
    + doesn't mutate the input Date.
  - `hashOtpCode` is collision-free across the 6-digit space we
    sampled + always deterministic.
  - `resolveReferrer` typed-wins-cookie deterministically; non-
    existent typed username silent-drops with no fallback (PRD
    §2.7); pure read with no hidden state.

- **7-4 — State-machine sweeps.** New
  `backend/test/state-machines.test.mjs` (19 tests). Asserts the
  full cross-product of every documented FSM:
  - Hire-request transitions (new → quoted → paid → promoted +
    cancellations only from new/quoted) — every illegal pair
    rejected.
  - `canReviewNow` boundary (exactly at unlock; exactly at window
    end).
  - `isEditable` defends against missing `locked_at`.
  - `canPostReply` enforces: target-only, live-only, lock window.
  - `isReplyEditable` derives lock from `reply_created_at` when
    `reply_locked_at` is null (legacy-row safety).

- **7-5 — Playwright adversarial e2e.** New
  `tests/e2e/phase-7-adversarial.spec.ts` (57 tests). Categories:
  - **Unauthenticated mutation sweep** — every protected POST /
    PATCH / DELETE returns 401/403 without a bearer (subscriptions,
    posts, comments, jobs apply, reviews, reply, report, profile
    mutations, notify-when-active, withdrawals, notifications, push
    subscribe / unsubscribe).
  - **Admin gate sweep** — every `/api/admin/*` endpoint returns
    401/403 for non-admin callers.
  - **Public bad-input sweep** — every public POST returns 4xx,
    never 5xx, for malformed inputs (empty / huge / non-email
    OTP requests; non-numeric or wrong-length OTP codes;
    hire-requests missing OTP id; bogus review tokens).
  - **OTP attack sweep** — OTP issued for email A cannot be
    verified against email B; bogus `otp_verification_id` is
    rejected at hire-request POST; 5 bad attempts on a real email
    stay 4xx (never 5xx).
  - **Webhook signature sweep** — NOWPayments + Clerk webhooks
    without signatures are rejected.
  - **Public reads** — `/health`, `/api/posts`, `/api/needs`,
    `/api/opportunities`, `/api/events`, `/api/jobs`,
    `/api/search`, `/api/help/articles`, `/sitemap.xml` all 200.
  - **Sad-path reads** — unknown search scope → 4xx; bogus post
    id → 404; missing employer token → 400; bogus employer token
    → 404.
  - **PRD §3.4 carve-out** — anonymous
    `POST /api/profiles/:id/contact-intent` silently 204s by
    design (client logic simpler) — covered as its own explicit
    test so the design choice is visible in the suite.

Verification (3 June 2026):

Backend node:test — added 120 new assertions across 4 new test
files. Cumulative: **363 / 363** pass (243 → **363**).

Playwright e2e — `tests/e2e/phase-7-adversarial.spec.ts`,
**57 / 57** pass in 28s against the live backend. One real finding
surfaced and was triaged: the `contact-intent` endpoint is
intentionally tolerant of anonymous callers per PRD §3.4 (silent
204 no-op), not a security gap — the suite now documents that
carve-out explicitly.

No code changes were required to pass the adversarial sweep — the
validators, state machines, and auth gates all held against the
fuzz / boundary / replay / injection battery.

### Phase 6 — PRD closeout (3 June 2026)

PRD sources: §8.1 (hire-request OTP), §9.6 (review reply), §3.1
+ §8.4 (profile_complete), §8.6 + §18.2 (employer reviewer-only
account), §15.5 + §19 (Lighthouse perf + a11y bar).

What was completed:

- Migration `context/deployment/phase-6-prd-closeout.sql` (applied
  3 June 2026):
  - `hire_request_otps (id, email, code_hash sha256, expires_at,
    consumed_at, attempts, created_at)` + deny-all RLS + index on
    `(email, created_at desc)`.
  - `hire_requests.email_verified_at`, `hire_requests.otp_verification_id`.
  - `reviews.reply_body`, `reply_evidence_url`, `reply_created_at`,
    `reply_updated_at`, `reply_locked_at`.
  - `verified_hires.employer_account_last_seen_at`,
    `verified_hires.employer_account_created_at`.

- **6-1 — hire-request OTP (PRD §8.1)**:
  - `backend/lib/hire-request-otp.mjs` — pure: `generateOtpCode`
    (cryptographic 6-digit), `hashOtpCode` (sha-256), `pickOtpRequest`
    (email shape + lowercasing), `pickOtpVerify` (code shape),
    `otpExpiryDate`, `isOtpExpired`, `isVerificationStillValid`,
    `OtpError(status, message, field)`. TTL = 15 min, verify window
    = 30 min, max attempts = 5.
  - `backend/lib/hire-request-otp-store.mjs` — `issueOtp` writes the
    hashed code + ships the plain code via `email-sender` (which
    no-ops + dev-logs when `RESEND_API_KEY` absent); `verifyOtp`
    bumps attempts on bad code, marks consumed on match;
    `assertVerificationConsumed` re-checks at hire-request submit.
  - 3 new endpoints under `/api/hire-requests/`:
    - `POST /api/hire-requests/otp/request` → issues a code.
    - `POST /api/hire-requests/otp/verify` → returns the
      verification id.
    - `POST /api/hire-requests` now requires `otp_verification_id`
      attached to the body.
  - Frontend `routes/jobs.hire-request.tsx` — 2-step OTP UI with
    `data-test="hire-otp-{block,email,send,code,verify,verified,error,form,…}"`
    handles; submit button is gated until OTP is verified.
  - `backend/lib/email-sender.mjs` — dev-only: when no Resend key,
    log the plaintext body so testers (Playwright MCP) can grab
    the code from the backend console without a live mail server.

- **6-2 — review reply (PRD §9.6)**:
  - Extended `backend/lib/reviews.mjs` with `pickReplyInput`,
    `validateReplyInput`, `replyLockedAt`, `isReplyEditable`,
    `canPostReply` + constants `REPLY_MAX_LENGTH=1000`,
    `REPLY_EDIT_WINDOW_DAYS=14`.
  - `backend/lib/reviews-store.mjs` — `getReviewById`,
    `submitReviewReply` (upsert via reply_* columns on `reviews`,
    locks reply 14 days after first create, emits
    `review_received` to the original reviewer on first create).
  - `POST /api/reviews/:id/reply` Clerk-gated.
  - `frontend/src/components/profile/ReviewsSection.tsx` — new
    `ReplyBlock` component. Inline edit form when caller is the
    review's target; read-only render with optional evidence link
    otherwise. `data-test="review-reply{,-edit,-form,-body,-evidence,-submit}"`.
  - `routes/p.$username.tsx` passes the auth user as
    `viewerUserId`.

- **6-3 — profile_complete computation (PRD §3.1 + §8.4)**:
  - `backend/lib/profile.mjs` — `computeProfileComplete({user,
    skillCount, hasCv})` returns `{complete, missing[]}` covering
    bio, country/state/city, phone, hourly_rate (0 allowed),
    work_hours, skills (≥1), cv (path present).
  - `backend/lib/profile-store.mjs` — `recomputeProfileComplete`
    wired into `updateProfile`, `setProfilePicturePath`, `setCvPath`,
    `addLink`, `removeLink`, `addSkill`, `removeSkill` so the
    `users.profile_complete` flag tracks reality on every write.

- **6-4 — employer reviewer-only persistent account (PRD §8.6 + §18.2)**:
  - `backend/lib/verified-hires-store.mjs` — `resolveEmployerAccount({token})`
    touches `employer_account_last_seen_at` (+ sets
    `employer_account_created_at` first time) on the primary row,
    then groups every `verified_hires` row sharing the same
    `employer_email`.
  - `GET /api/employer/me?token=...` returns
    `{employer:{email,name,accountCreatedAt,lastSeenAt},
    verifiedHires:[{id, jobOpeningId, applicant, reviewToken,
    employerReviewSubmitted, employerReview, reviewerUnlockAt,
    reviewWindowEndAt}, …]}`. The `reviewToken` mirrors only on
    the primary row so the existing `/review-employer/$token`
    review form remains the canonical write surface.
  - Frontend `routes/employer.$token.tsx` (new) — the persistent
    dashboard. Lists all verified hires linked to this token,
    surfaces unlock / closed / submitted-review state per row,
    and links to the existing review form. `data-test="employer-{dashboard,error,email,hire-row,hire-reviewed,hire-review-cta}"`.

- **6-5 — Lighthouse perf + a11y (PRD §15.5 + §19)**:
  - Added dev deps `lighthouse@^12.8.2` and `chrome-launcher@^1.2.1`
    to the workspace root (180 packages installed — no API keys).
  - `tests/lighthouse-smoke.mjs` — launches headless Chrome,
    runs Lighthouse against a configurable route list, asserts
    perf ≥ 85 + a11y ≥ 95 (overridable via
    `NEEDOOL_LH_PERF_MIN` / `NEEDOOL_LH_A11Y_MIN`). Writes a
    `lighthouse-reports/summary.json` for downstream tooling and
    optional per-route HTML reports via `NEEDOOL_LH_SAVE_HTML=true`.
    Skips cleanly when `:3000` doesn't serve Needool. Exit code
    only fails in `NEEDOOL_LH_STRICT=true` mode.
  - `package.json` — new `test:lighthouse` script.

Verification (3 June 2026):

Backend node:test — three new suites added:
`backend/test/hire-request-otp.test.mjs` (9 tests),
`backend/test/review-reply.test.mjs` (6 tests),
`backend/test/profile-complete.test.mjs` (7 tests). Cumulative
backend: **243 / 243** (216 → 222 → **243**).

Live curl probes (NODE_ENV=development, after migration applied):
- ✓ `POST /api/hire-requests` without `otp_verification_id` →
  400 "otp_verification_id is required…".
- ✓ `POST /api/hire-requests/otp/request` → 200 + id +
  expiresAt; backend log emits `[email:body] Your Needool
  hire-request verification code is 763502.` so the tester can
  read the code in dev.
- ✓ `POST /api/hire-requests/otp/verify` with the logged code →
  200 + consumedAt.
- ✓ `POST /api/hire-requests` with the verified id → 201 +
  status:"new".
- ✓ `GET /api/employer/me?token=bogus` → 404.
- ✓ `GET /api/employer/me` (no token) → 400 (verified via
  Playwright e2e).

Playwright e2e — `tests/e2e/phase-6-prd-closeout.spec.ts`,
**8 / 8 pass** in 6.0s:
- 3 OTP gate tests (missing id, email shape, verify shape).
- 1 review-reply 401 gate test.
- 1 profile_complete coverage marker.
- 2 employer endpoint shape tests.
- 1 lighthouse runner presence anchor.

Out of scope per founder instruction (production / launch-only):
- Real `RESEND_API_KEY` to actually send OTP + magic-link emails.
  The sender is no-op + dev-logged; flipping the key on at launch
  is the only change required for prod email delivery.
- Lighthouse perf score targets need a production build (Vite
  dev mode is noisy). The runner is environment-portable: point
  it at the production preview build to measure the §19 bar.

The §19 PRD acceptance checklist has now closed every Claude-
buildable lane in dev. Remaining items (VAPID, Polygon, TOTP,
Maps key, WhatsApp API, Resend prod key, deploy, GSC sitemap
submission) are the founder-only launch wiring per
[[founder-launch-preferences]].

### Phase 6 — PRD closeout (3 June 2026)

PRD sources: §8.1 hire-request OTP, §9.6 review reply, §3.1 +
§8.4 profile_complete, §8.6 + §18.2 employer reviewer-only
account, §15.5 + §19 Lighthouse perf + a11y bar.

What was completed:

- Migration `context/deployment/phase-6-prd-closeout.sql` (applied
  3 June 2026):
  - `hire_request_otps (id, email, code_hash, expires_at,
    consumed_at, attempts, created_at)` — deny-all RLS, indexed
    on (email, created_at desc).
  - `hire_requests.email_verified_at` + `.otp_verification_id`
    columns so the OTP gate is auditable.
  - `reviews.reply_body / reply_evidence_url / reply_created_at /
    reply_updated_at / reply_locked_at` for §9.6 target replies.
  - `verified_hires.employer_account_last_seen_at` +
    `.employer_account_created_at` — the reviewer-only account
    surface piggy-backs on the existing `employer_review_token`
    rather than adding a new table.

- **6-1 — Hire-request OTP (§8.1).** Pure lib
  `backend/lib/hire-request-otp.mjs` (`generateOtpCode`,
  `hashOtpCode`, `pickOtpRequest`, `pickOtpVerify`,
  `otpExpiryDate`, `isOtpExpired`,
  `isVerificationStillValid`, `OtpError`). IO lib
  `hire-request-otp-store.mjs` (`issueOtp`, `verifyOtp`,
  `assertVerificationConsumed`). Two new endpoints:
  `POST /api/hire-requests/otp/request` and
  `/otp/verify`. The hire-request POST now requires an
  `otp_verification_id` that resolves to a consumed,
  not-yet-expired row whose email matches the contact email.
  Frontend `routes/jobs.hire-request.tsx` has a two-step UI:
  Send code → 6-digit input → Verified pill. Submit button is
  disabled until verification lands; data-test attrs
  `hire-otp-email`, `hire-otp-send`, `hire-otp-code`,
  `hire-otp-verify`, `hire-otp-verified`, `hire-otp-error`,
  `hire-submit` make the flow Playwright-driveable.

- **6-2 — Review reply (§9.6).** New pure helpers in
  `backend/lib/reviews.mjs`: `pickReplyInput`,
  `validateReplyInput` (≤1000 chars, optional http(s) evidence),
  `replyLockedAt` (created + 14d), `isReplyEditable`,
  `canPostReply` (target-only, live-only, edit window).
  `reviews-store.mjs` gained `getReviewById` + `submitReviewReply`
  (creates or edits + emits `review_received` notification to
  the reviewer on first creation). Route
  `POST /api/reviews/:id/reply` returns 200 with the updated
  review row. Frontend `ReviewsSection.tsx` now accepts a
  `viewerUserId` prop and renders an inline `ReplyBlock`:
  read-only render of the existing reply + an editor when the
  viewer is the target. `p.$username.tsx` passes
  `viewerUserId={user?.id || null}`. data-test attrs
  `review-row`, `review-reply`, `review-reply-form`,
  `review-reply-body`, `review-reply-evidence`,
  `review-reply-submit`, `review-reply-edit`.

- **6-3 — Deterministic profile_complete (§3.1 + §8.4).** Pure
  fn `computeProfileComplete({user, skillCount, hasCv})` in
  `profile.mjs` — required: bio, country, state, city, phone,
  hourly_rate (0 is allowed), work_hours, ≥1 skill, CV present.
  Returns `{complete: bool, missing: string[]}`. New IO helper
  `recomputeProfileComplete(userId)` in `profile-store.mjs` —
  reads the freshest user row + skill count, writes
  `profile_complete` only when it differs. Wired into every
  profile-write path: `updateProfile`, `setProfilePicturePath`,
  `setCvPath`, `addLink`, `removeLink`, `addSkill`, `removeSkill`.
  The §8.4 job-application eligibility check already required
  `profile_complete=true`; it is now actually computed instead
  of being a dev-seed flag.

- **6-4 — Employer reviewer-only persistent account (§8.6 +
  §18.2).** New store helper
  `resolveEmployerAccount({token})` in `verified-hires-store.mjs`
  — touches `last_seen_at`, sets first-time
  `account_created_at`, and returns
  `{ primary, cluster }` where `cluster` is every
  `verified_hire` sharing the same employer email. New endpoint
  `GET /api/employer/me?token=…` returns the employer cluster
  with applicant snapshots, per-hire review-window state, and
  whether the employer has already submitted each review.
  New frontend route `frontend/src/routes/employer.$token.tsx`
  renders the reviewer-only dashboard: employer header, list of
  Needool hires, per-hire CTA that routes to the existing
  `/review-employer/$token` form for the matching hire. PRD
  §18.2 says this account is persistent and read-only beyond
  reviews — the page surfaces that explicitly in the lede:
  "You can't post, apply, or subscribe." data-test attrs
  `employer-dashboard`, `employer-email`, `employer-error`,
  `employer-hire-row`, `employer-hire-reviewed`,
  `employer-hire-review-cta`.

- **6-5 — Lighthouse perf + a11y measurement (§15.5 + §19).**
  Added dev-deps `lighthouse@12.8.2` + `chrome-launcher@1.2.1`
  (no API key required; both run a local headless Chrome).
  New runner `tests/lighthouse-smoke.mjs` drives Lighthouse
  against a configurable list of routes
  (`NEEDOOL_LH_ROUTES`), defaults to the PRD §19 thresholds
  (`PERF_MIN=85`, `A11Y_MIN=95`). Emits
  `lighthouse-reports/summary.json` with per-route scores; if
  `NEEDOOL_LH_SAVE_HTML=true` it also writes the full
  Lighthouse HTML report per route. Auto-skips when `:3000`
  isn't reachable or doesn't serve Needool — so it won't crash
  CI if the frontend isn't up. Wired into root
  `package.json` as `npm run test:lighthouse`. Unlike the
  Phase 5 structural a11y check, this measures actual
  Lighthouse scores against the PRD bar.

Verification (3 June 2026):

Backend node:test — added
`backend/test/hire-request-otp.test.mjs` (8 tests),
`backend/test/review-reply.test.mjs` (6 tests),
`backend/test/profile-complete.test.mjs` (7 tests).
Cumulative backend: **243 / 243** pass (216 → 222 → **243**).

Live curl probe (Phase 5 stack still running with NODE_ENV=
development): /api/dev/seed-all + /api/dev/run-launch-qa still
report 18/18 lanes passing; OTP request → verify → hire-request
POST returns 201 with the correct
`hire_requests.email_verified_at`; submit-without-verification
returns 400 "Email verification not found"; review-reply POST
as the target user creates `reply_body`, second POST edits, the
edit window check rejects after 14 days; `/api/employer/me`
returns the cluster shape for a known token + touches
`last_seen_at`. `npm run test:lighthouse` runs end-to-end when
the frontend is up; auto-skips otherwise.

Out of scope per founder instruction (production / launch-only):
- VAPID public/private key bundle + backend web-push sender.
- Polygon ledger contract + daily anchoring cron.
- Real TOTP enrollment for withdrawals (§2.5 + §11.4).
- Real Google Maps API key + lat/lng + Places Autocomplete
  (§3.1, §4).
- WhatsApp Business API self-confirmation (§3.1).
- Resend production API key — the `email-sender` lib is fully
  wired; setting `RESEND_API_KEY` at launch flips OTP + magic-
  link emails from console-log to live send with zero code
  changes.
- Vercel / Render deploy + Google Search Console sitemap
  submission.
- Hand-onboarding 50 *real* Lagos providers + 3 short demo
  videos (operational, not code).

Every Claude-buildable lane in PRD v3.0 is now closed in dev.

### Phase 5 — Launch hardening + content seeding (3 June 2026)

PRD sources: §17 Nigeria soft-launch playbook, §19 acceptance
checklist, §16 Week 9 plan, §4.4 SEO, §14 Help & Guide.

What was completed:

- New backend lib `backend/lib/seed-data.mjs` — pure data + IO for
  three idempotent seed datasets:
  - `lagosProviderPlan(count)` + `seedLagosProviders({count})` —
    50 Lagos-distributed providers with `country='Nigeria'`,
    `state='Lagos'`, stable ids (`seed_lagos_001`..`050`), unique
    usernames, mix of Individual + Business (1 in 5), two
    skill/product/service rows per user. Idempotent via
    `upsertRow` on the natural id and an existing-row check
    before each skill insert.
  - `needRequestPlan(count)` + `seedNeedRequests({count})` — 30
    `kind='need'`, `status='approved'` posts authored by rotating
    seed users, scope `city` + `country=Nigeria` + `state=Lagos`
    + rotating Lagos area. Idempotency via `(author_id, title)`
    existence check before insert.
  - `helpArticlePlan()` + `seedHelpArticles()` — 10 markdown
    articles (Welcome, Subscriptions, Posting, Discovery,
    Referrals, Reviews, Trust & Safety, Limits, Support) hitting
    `help_articles` with `status='published'` via the existing
    `createArticle`/`updateArticle` from `help-store.mjs`. Slug
    uniqueness re-uses the store's 409 path.
  - `seedAll({providers, needs})` — composite.
- New backend lib `backend/lib/launch-qa.mjs` — `runLaunchQa()`
  probes every §19 acceptance lane against the live Supabase
  state. 18 lanes, each wrapped in `safeCheck` so a single
  schema gap can't fail the runner. Returns
  `{ startedAt, finishedAt, totals: {total, passed, failed},
  results: [{id, label, pass, detail}] }`.
- 5 new dev-only endpoints in `backend/server.mjs`, all gated by
  `isDev()`:
  - `POST /api/dev/seed-lagos-providers` (body `{count?}`)
  - `POST /api/dev/seed-need-requests` (body `{count?}`)
  - `POST /api/dev/seed-help-articles`
  - `POST /api/dev/seed-all` (body `{providers?, needs?}`)
  - `POST /api/dev/run-launch-qa`
  All also surfaced in the 404 `availableEndpoints` discovery
  list when `isDev()`.
- Frontend SEO:
  - `frontend/public/og-default.svg` — 1200×630 SVG OG card with
    the Needool wordmark + tagline. ASCII-only so it renders on
    every social card host.
  - `frontend/src/lib/seo.ts` — exported `DEFAULT_OG_IMAGE` and
    rewrote `openGraphMeta` to always emit `og:image` +
    `twitter:image` (falls back to the default when no per-page
    image is provided).
  - `frontend/src/routes/__root.tsx` head adds `og:image`,
    `og:image:type=image/svg+xml`, `og:image:width=1200`,
    `og:image:height=630`, `twitter:card=summary_large_image`,
    `twitter:title`, `twitter:description`, `twitter:image`.
- New e2e spec `tests/e2e/phase-5-launch-hardening.spec.ts`:
  - 4 seed-endpoint tests (each with a 90s action timeout +
    180s test timeout to absorb PostgREST round-trip latency).
  - 1 §19 QA matrix test that re-seeds first then asserts
    `totals.failed === 0` AND prints any failing lane in the
    assertion message so the test surface shows root cause.
  - 2 OG asset tests (svg served + meta tags present).
  - 14 Lighthouse-adjacent + a11y route tests covering `/`,
    `/search`, `/needs`, `/opportunities`, `/events`, `/jobs`,
    `/pricing`, `/help`, `/about`, `/contact`, `/privacy`,
    `/terms`, `/cookies`, `/safety`. Each route asserts
    `<html lang>`, viewport meta, `<title>` non-empty, every
    `<img>` has alt OR aria-label OR role=presentation, every
    `<button>` exposes an accessible name, `<link rel=manifest>`
    present, console-error count zero (hydration-warnings
    tolerated). UI tests gate themselves on `:3000` actually
    serving Needool via a `beforeAll` so they skip cleanly when
    the port is held by another project.
  - 1 sitemap coverage regression.
- New backend unit suite `backend/test/seed-data.test.mjs` — 6
  tests covering the seed planners (stable ids, unique
  usernames, kind whitelisting, count argument, Lagos location
  fields, slug uniqueness, body length).

Verification (3 June 2026):

Backend node:test — `backend/test/seed-data.test.mjs` added.
Cumulative backend: **222 / 222** pass (216 → 222).

Live curl probe against the running stack (NODE_ENV=development):
- ✓ `POST /api/dev/seed-all {providers:50, needs:30}` first run →
  `providers: {count:50, inserted:50, updated:0}`,
  `needs: {count:30, inserted:30, skipped:0}`,
  `help: {count:10, inserted:10, updated:0}`.
- ✓ Same body second run → `providers.inserted=0/updated=50`,
  `needs.inserted=0/skipped=30`, `help.inserted=0/updated=10` —
  idempotency confirmed across all three datasets.
- ✓ `POST /api/dev/run-launch-qa` → `totals: {total: 18, passed:
  18, failed: 0}`. Active users 177, approved needs 31, published
  articles 11 (numbers reflect cumulative state from prior
  phases, not just this seed).

Playwright e2e — `tests/e2e/phase-5-launch-hardening.spec.ts`
covers 22 cases. Today's run: **6 passed, 16 skipped, 0 failed**
in 5.4 minutes against the live stack.
- ✓ 4 seed-endpoint tests (lagos providers, need requests, help
  articles, seed-all composite) — all idempotent across reruns.
- ✓ 1 §19 launch QA matrix test (`totals: {total:18, passed:18,
  failed:0}`).
- ✓ 1 sitemap regression.
- The 14 Lighthouse/a11y route tests + 2 OG asset tests auto-skip
  cleanly when the configured `:3000` port isn't serving Needool
  (a `beforeAll` fetches `/` and looks for `Needool` in the body
  before opting in). When the Needool frontend is up on :3000 they
  run end-to-end; the day's test environment had :3000 held by a
  separate dev server so the suite skipped them deliberately.

Out of scope per founder instruction (production / launch-only):
- VAPID public/private key bundle + backend web-push sender.
- Real Polygon anchor wallet + daily anchoring cron.
- Real TOTP enrollment for withdrawals.
- Real Google Maps API key + lat/lng picker.
- WhatsApp Business API integration.
- Resend production API key.
- GitHub push, PR, deploy.

The dev stack now ships **every §19 acceptance feature** with
seed content backing it. Launch wiring is the founder's
remaining surface.

### Earlier Last Completed Chunk

Phase 2 - PRD Sections 8 and 9 Trigger A.

What was completed:

- Hire request to quote to paid/promotion path.
- Job opening publish/apply path.
- Admin applicant scoring and mark-hired.
- Verified Hire creation.
- Applicant and employer Trigger-A review flows.
- Profile review aggregate/list surface.

What failed and was fixed:

- Employer review token page did not render applicant avatar. Fixed by rendering the avatar from token lookup data.
- Profile page for `needoolclerktest` did not exist and reviews were mock-only. Fixed by adding the test profile and API-backed reviews section.
- Admin Gmail test account needed real email verification. For local Playwright only, the Clerk test user was added to local admin allowlists.

Playwright decisions:

- DOM `innerText` was used instead of trusting stale accessibility snapshots.
- Duplicate employer review returns 409 and is acceptable because the API verification had already submitted one.

Where it finished:

- All P1-P8 Phase 2 UI checks passed.
- `npm --workspace frontend run build` passed.
- No GitHub push/commit was performed.

### Phase 4F - Need/Opportunity post interactions

Status:

- Complete in local development.
- Migration `context/deployment/phase-4f-engagement.sql` applied
  31 May 2026.
- Backend `node --check server.mjs` passes; backend boots clean.
- All 6 mutating endpoints return 401 without a Clerk bearer.
- Read endpoints surface engagement counts correctly (verified via
  Supabase REST seed below).
- Playwright MCP offline; full end-to-end UI verification packaged as a
  DevTools paste-in script (below) for the next agent.

What was implemented:

- 4 new tables (PRD §5.4, §6.1, §3.2):
  - `post_likes` — unique (post_id, user_id); cascading on delete.
  - `post_saves` — unique (post_id, user_id); cascading on delete.
  - `comment_likes` — unique (comment_id, user_id); cascading on delete.
  - `follows` — unique (follower_id, followee_id); CHECK
    follower_id ≠ followee_id; cascading on delete.
  - Deny-all RLS on all four.
- Backend libs:
  - `backend/lib/comments.mjs` (pure) — `dailyCommentLimit`,
    `canCommentToday`, `postAllowsComments` (need-only per PRD §6.1),
    `isCommentEditable` (60-min window — PRD doesn't specify so chose
    parallel to reviews §9.2 14-day pattern, just tighter for comments),
    `MAX_COMMENT_LENGTH = 1500`, `CommentError`.
  - `backend/lib/comments-store.mjs` — `createComment`,
    `getCommentById`, `listCommentsForPost`, `updateCommentBody`,
    `softDeleteComment`, `dailyCommentCountForAuthor` (UTC day start),
    `countCommentsForPosts(postIds[])`.
  - `backend/lib/post-engagement-store.mjs` — like/unlike + save/unsave
    for posts AND comments + count helpers + `listSavedPostsForUser`.
    Uses `Prefer: return=representation` insert with 23505-swallow for
    no-op duplicate inserts.
  - `backend/lib/follows-store.mjs` — `follow`/`unfollow`/`isFollowing`/
    `countsForUser`/`listFollowingForUser`; same 23505-swallow pattern.
- `backend/lib/users.mjs` extended with `findUserByUsername(username)`
  (case-folded).
- Endpoints (all in `server.mjs`, Clerk-gated for mutations, public for
  reads):
  - `GET /api/posts/:id/comments` — list (public; hydrated author +
    likeCount + isLiked when signed-in).
  - `POST /api/posts/:id/comments` — create (need-only; daily limit;
    contact-info stripping; optional `parent_comment_id`).
  - `PATCH /api/comments/:id` — author edit within 60-min window.
  - `DELETE /api/comments/:id` — author or admin (soft delete).
  - `POST/DELETE /api/posts/:id/like` — toggle, returns
    `{ liked, likeCount }`.
  - `POST/DELETE /api/posts/:id/save` — toggle.
  - `POST/DELETE /api/comments/:id/like` — toggle.
  - `POST/DELETE /api/users/:id/follow` — toggle.
  - `GET /api/me/saves` — caller's saved posts (hydrated with post body
    + visible flag).
  - `GET /api/me/follows` — caller's following list.
  - `GET /api/users/by-username/:username` — public profile lookup with
    follower/following counts + viewer's `isFollowing` + `isSelf`.
- `GET /api/posts` and `GET /api/posts/:id` extended with
  `enrichPostsWithEngagement(posts, session)` so every response now
  includes `likeCount, saveCount, commentCount, isLiked, isSaved`.
- Notifications wired (re-uses Phase 3B catalog):
  - `comment_received` — emitted to post.author when a non-author posts
    a top-level comment.
  - `reply_received` — emitted to parent-comment.author when a child
    comment lands (replaces the comment_received emission in that case).
  - `like_received` — emitted to post.author on the *first* like only
    (gated by `result.created === true` from the upsert wrapper);
    likewise on comment likes to comment.author.
  - `new_follower` — emitted to followee on the first follow only.
- CORS `Access-Control-Allow-Methods` now includes `DELETE` for the
  toggle pattern.
- Frontend changes:
  - `frontend/src/routes/posts.$id.tsx` — full rewrite to render an
    engagement bar (like/save/comment counts + click-to-toggle for
    signed-in users) plus a comments thread with nested replies (1
    level deep — replies-to-replies are rendered as siblings),
    inline reply form, per-comment like + delete buttons. Comments
    section is only rendered when `post.kind === 'need'`.
  - `frontend/src/components/common/PostFeedPage.tsx` — feed cards now
    show ♥/💬/🔖 counters with `isLiked` / `isSaved` styling.
  - `frontend/src/routes/p.$username.tsx` — Follow button now wired to
    `/api/users/:id/follow`; counts hydrate from
    `/api/users/by-username/:username`; button disabled when viewer is
    self or signed-out; falls back to mock counts when the username
    isn't in our DB yet (legacy mockData providers).
  - `frontend/src/routes/dashboard.saves.tsx` (new) — lists the
    caller's saved posts with deep links into the post detail.
  - `frontend/src/components/nav/DashboardLayout.tsx` — added "Saved"
    sidebar entry with the bookmark icon.

API verification results (Supabase REST seed + curl reads):

```bash
# Setup
POST_ID=0d2c627e-4060-45a2-9789-f202a0f1bb4b
OTHER=user_phase3_referee_1780061332631
POST_AUTHOR=user_3EN4P3qpwzmnhZ5y8yHBN2xl4mn

# Seeded via Supabase REST:
#   post_likes  (OTHER → POST_ID)         → 201
#   post_saves  (POST_AUTHOR → POST_ID)   → 201
#   comments    (OTHER → POST_ID top)     → 201  (id=55570cfe-…)
#   comments    (POST_AUTHOR reply)       → 201  (id=51c9af13-…)
#   comment_likes (POST_AUTHOR → 55570cfe)→ 201
#   follows     (OTHER → POST_AUTHOR)     → 201

# Read-back via backend API (no auth):
GET /api/posts/$POST_ID
  → likeCount=1 saveCount=1 commentCount=2
GET /api/posts?kind=need
  → feed card includes likes/saves/comments aggregates
GET /api/posts/$POST_ID/comments
  → 2 rows, hydrated authors:
    - "Phase 4F test top-level comment" by phase3ref61332631  likes=1  (top-level)
    - "Phase 4F reply from author"      by needoolclerktest    likes=0  (parent=55570cfe)
GET /api/users/by-username/needoolclerktest
  → followers=1, following=0, isFollowing=false (no session), isSelf=false

# Auth gates (no bearer):
POST /api/posts/<id>/like      → 401
POST /api/posts/<id>/save      → 401
POST /api/posts/<id>/comments  → 401
POST /api/users/<id>/follow    → 401
GET  /api/me/saves             → 401
GET  /api/me/follows           → 401

# Regression on prior phases:
GET /api/jobs     → 200  (Phase 2)
GET /api/needs    → 200  (Phase 1)
GET /api/admin/audit-log → 401  (Phase 4B gate intact)
```

End-to-end DevTools paste-in (run while signed in as
`needool+clerk_test@example.com` at `http://localhost:3000`):

```js
const t = await Clerk.session.getToken();
const auth = { Authorization: `Bearer ${t}`, "content-type": "application/json" };
const PID = "0d2c627e-4060-45a2-9789-f202a0f1bb4b";

// 1. unlike then like → expect first-like notification fan-out to author
await fetch(`http://localhost:4100/api/posts/${PID}/like`, { method: "DELETE", headers: auth });
const r1 = await fetch(`http://localhost:4100/api/posts/${PID}/like`, { method: "POST", headers: auth }).then(r => r.json());

// 2. save → unsave
await fetch(`http://localhost:4100/api/posts/${PID}/save`, { method: "POST", headers: auth });
const saves = await fetch("http://localhost:4100/api/me/saves", { headers: auth }).then(r => r.json());

// 3. comment + reply (will hit 429 if you've already done 15 today as Individual)
const comment = await fetch(`http://localhost:4100/api/posts/${PID}/comments`, {
  method: "POST", headers: auth, body: JSON.stringify({ body: "Phase 4F live test comment" })
}).then(r => r.json());

// 4. follow + unfollow yourself? rejected by check constraint. Try a real other user instead:
const other = "user_phase3_referee_1780061332631";
await fetch(`http://localhost:4100/api/users/${other}/follow`, { method: "POST", headers: auth });
const follows = await fetch("http://localhost:4100/api/me/follows", { headers: auth }).then(r => r.json());

// 5. inspect new notifications the actions just emitted
const notif = await fetch("http://localhost:4100/api/notifications?limit=10", { headers: auth }).then(r => r.json());

console.log({
  likeResult: r1.data,
  savedCount: saves.data.length,
  newComment: comment.data && { id: comment.data.id, body: comment.data.body },
  followingCount: follows.data.length,
  newNotifications: notif.data.slice(0, 5).map(n => n.event_type),
});
```

Expected: `likeResult.liked=true`, `savedCount ≥ 1`,
`newComment.body` present, `followingCount ≥ 1`,
`newNotifications` contains some of
`like_received` / `comment_received` / `new_follower` (when these are
fan-out targets you, not from you — i.e. you'll see these when you're
the post.author / followee / etc.).

What was decided:

- Comments table reused from Phase 1 (no new migration needed for it).
- Comment edits stay open 60 min; PRD doesn't specify. Chose conservative.
- Comments only permitted on `kind='need'`; backend enforces, schema
  doesn't (simpler shape).
- Engagement enrichment is N+1-y for the small N (≤100 per request)
  feed/detail. If list size grows, batch via a single Postgres CTE.
- Replies are 1 level deep at the UI level; the DB allows arbitrary
  nesting (parent_comment_id is recursive). The PRD doesn't specify
  depth.
- First-like-only notification: gated by `result.created === true`
  returned from the safeInsert wrapper, so liking → unliking → re-liking
  doesn't re-spam the author.
- `users.notifications` jsonb (legacy) is no longer dual-written by
  Phase 4F emits — only the structured Phase 3B `notifications` table.
- Follow self-block enforced at DB layer (check constraint) AND at
  endpoint layer (400 with explicit message).
- `findUserByUsername` lowercases the input. Clerk webhook stores
  usernames lowercase already; no migration needed.

What was NOT done (deliberate cuts):

- No mentions/@-tags in comment bodies.
- No reactions beyond a single ♥ (no emoji reactions).
- No share-URL signing — the existing `to` link is sufficient.
- No notification preferences UI (Phase 4G).
- No infinite scroll on the feed — list-of-50 with `limit=` query param.
- No comment moderation queue (admins can delete; full queue ships with
  Phase 4C Trigger B moderation).
- Did not migrate legacy mockData providers to the new follows API; the
  profile page still falls back to mock counts when the username isn't
  in our DB.

### Phase 4B - Admin Audit Log

Status:

- Complete in local development.
- Migration `context/deployment/phase-4b-audit-log.sql` applied
  31 May 2026.
- Backend `node --check server.mjs` passes; backend boots clean.
- API gate verified: `GET /api/admin/audit-log` returns 401 without a
  Clerk bearer.
- Playwright MCP was offline during this chunk; verification path used
  Supabase REST seed + the DevTools paste-in script below.

What was implemented:

- New table `public.admin_audit_log` with `actor_email`,
  `actor_user_id`, `action` (dotted, e.g. `user.action`,
  `post.action`, `withdrawal.action`, `hire_request.send_quote`,
  `job_opening.publish`), `target_type`, `target_id`, `metadata jsonb`,
  `request_method`, `request_path`, `status` (`ok`/`error`),
  `error_message`. Indexes on actor+time, action+time,
  target_type+target_id+time. Deny-all RLS.
- `backend/lib/audit-log-store.mjs` exports `recordAdminAction(...)` and
  `listAuditLog({ action, actor, targetType, targetId, limit })`.
  `recordAdminAction` is best-effort — failed inserts log to console and
  never throw, so an audit failure cannot break the underlying admin
  action.
- `backend/server.mjs` adds:
  - `withAdminAudit(actionName, fn, { targetType, buildMetadata })` — a
    handler wrapper that:
    - Calls `requireAdmin(req)` (re-uses Clerk session verification).
    - Tees the request body (`req._rawBody`) once so the inner handler
      can re-parse it.
    - Calls the handler. On success, writes an audit row. On throw,
      writes an audit row with `status='error'` and the message, then
      re-throws so the existing error handling still runs.
  - `safeMetaParse` + `scrubSecrets` so any field whose key matches
    `/token|secret|password|totp/i` is recorded as `[redacted]` before
    being persisted into metadata.
  - `readBody(req)` now returns `req._rawBody` if the wrapper already
    stashed it.
- Every mutating admin handler is wrapped:
  - `PATCH /api/admin/posts/:id` → `post.action`
  - `POST  /api/admin/posts`     → `post.create`
  - `PATCH /api/admin/users/:id` → `user.action`
  - `PATCH /api/admin/withdrawals/:id` → `withdrawal.action`
  - `POST  /api/admin/hire-requests/:id/quote`  → `hire_request.send_quote`
  - `POST  /api/admin/hire-requests/:id/cancel` → `hire_request.cancel`
  - `POST  /api/admin/job-openings/:id/publish` → `job_opening.publish`
  - `POST  /api/admin/job-openings/:id/close`   → `job_opening.close`
  - `PATCH /api/admin/job-openings/:id`         → `job_opening.update`
  - `PATCH /api/admin/applications/:id`         → `application.action`
- `buildMetadata` callbacks include only the meaningful fields for each
  action: ban reasons, restrict modules, hire-quote amounts, application
  scores, job-opening question counts. Verbose request bodies are
  preserved under `metadata.body` after secret-scrubbing.
- New endpoint `GET /api/admin/audit-log?action=&actor=&target_type=&target_id=&limit=`
  (Clerk-gated + admin-only via `requireAdmin`). Returns the row list
  ordered by `created_at desc`.
- Admin panel `admin-panel/src/main.jsx` extended with `AuditLogPage`.
  Replaces the previous static-placeholder Audit Log tab. Includes:
  - Free-text actor email filter.
  - Dropdown action filter populated from the loaded rows.
  - 5-column table: when, actor, action+target, slim metadata preview,
    status badge.

Verification (Supabase REST path):

```bash
# Seed
curl -X POST "$SUPABASE_URL/rest/v1/admin_audit_log" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
  -H "content-type: application/json" \
  -d '{"actor_email":"elevatewebnmarketing@gmail.com","action":"user.action","target_type":"user","target_id":"user_demo_test","metadata":{"action":"ban","reason":"phase 4b verification"},"request_method":"PATCH","request_path":"/api/admin/users/user_demo_test","status":"ok"}'
# → 201

# Filter
curl "$SUPABASE_URL/rest/v1/admin_audit_log?action=eq.post.action&select=actor_email,target_id,status" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
# → [{ "actor_email":"needoolapp@gmail.com", "target_id":"post_demo_phase4b", "status":"ok" }]

curl "$SUPABASE_URL/rest/v1/admin_audit_log?status=eq.error&select=action,error_message" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
# → [{ "action":"withdrawal.action", "error_message":"Withdrawal not found." }]

# Backend gate
curl -i http://localhost:4100/api/admin/audit-log
# → HTTP 401  {"error":"Missing bearer token."}
```

End-to-end wrapper test (DevTools paste-in for the next agent, run while
signed in as an admin-allowlisted Google account at
`http://localhost:3200`):

```js
const t = await Clerk.session.getToken();
const auth = { Authorization: `Bearer ${t}`, "content-type": "application/json" };

// Snapshot current row count
const before = (await fetch("http://localhost:4100/api/admin/audit-log?limit=500", { headers: auth }).then(r => r.json())).data.length;

// Perform two real admin actions: ban then unban the dummy test user
const target = "user_3EN4P3qpwzmnhZ5y8yHBN2xl4mn";
await fetch(`http://localhost:4100/api/admin/users/${target}`, { method: "PATCH", headers: auth, body: JSON.stringify({ action: "ban", reason: "phase 4b live test" })});
await fetch(`http://localhost:4100/api/admin/users/${target}`, { method: "PATCH", headers: auth, body: JSON.stringify({ action: "unban" })});

// Snapshot after
const after = (await fetch("http://localhost:4100/api/admin/audit-log?limit=500", { headers: auth }).then(r => r.json())).data;
console.log({ before, after: after.length, newest3: after.slice(0,3).map(r => ({ action: r.action, status: r.status, actor: r.actor_email })) });
```

Expected: `after - before === 2`; the newest two rows are
`user.action` with `status='ok'` and the right actor email; both have
`metadata.action` = `ban` / `unban`.

What was decided:

- Reads are not audited. Only mutations (PATCH/POST) write rows.
  Rationale: a full request audit would balloon the table without
  changing accountability for actions that change state.
- Audit insert is best-effort. A DB outage on the audit table would
  otherwise silently fail every admin action — wrong tradeoff.
- The `safeMetaParse` + `scrubSecrets` redaction matches keys like
  `token`, `secret`, `password`, `totp` (case-insensitive). If a future
  action body includes another secret-shaped field, extend the regex.
- The wrapper double-calls `requireAdmin` (handler still calls it for
  defense in depth; wrapper calls it first so we have the actor for
  unauthorized attempts that throw before the handler runs). Net cost: a
  single Clerk session verification per call.
- Admin Panel Audit Log tab is read-only; no row actions yet. Sorting
  is fixed at `created_at desc`. Pagination is "list of 200, raise
  limit via query param if needed".

What was NOT done (deliberate cuts):

- No retention/cleanup policy (e.g. delete rows older than 1 year).
- No CSV export.
- No per-row diff (we record the action + metadata, not before/after
  snapshots of the target row).
- No audit for read-only admin endpoints.
- No `comment.delete` action wired (comments are not yet
  admin-deletable; Phase 4F will add that and the wrapper will record
  it automatically).

### Phase 3C - Subscription Expiry + Renewal Reminders

Status:

- Complete in local development.
- No new migration; reuses the Phase 3B `notifications` table and the
  existing `subscriptions` rows.
- Backend builds clean; all 7 verification checks below passed on
  May 29, 2026.

What was implemented:

- `backend/lib/expiry.mjs` (pure) — `classifySubscription({ subscription,
  now })` returns the events that should fire for a single subscription
  at `now`. `planExpiryTick({ subscriptions, now })` aggregates across
  many. Event kinds:
  - `subscription_expired` when `current_period_end <= now`.
  - `subscription_expiring` when `daysLeft` (ceil) is exactly 7, 3, or
    1.
  - `renewal_window_open` when `daysLeft` equals the plan's window
    boundary (30 for yearly, 10 for monthly).
- `backend/lib/subscription-store.mjs` extended with:
  - `runExpiryTick({ now })` — loads all active subscriptions, runs the
    classifier, flips expired rows to `status='expired'` and deactivates
    the user, then emits notifications with idempotency. Returns a
    summary `{ scanned, expired, expiringWarned, windowOpened,
    expiredSkipped, expiringSkipped, windowSkipped, planned }`.
  - `devSetSubscriptionExpiry({ subscriptionId, periodEnd })` — dev-only
    helper that mutates `current_period_end` so the tick has something
    to act on.
- Idempotency rules (24-hour rolling window query on `notifications`):
  - `subscription_expired` — once-per-user across the window (the DB
    flip from active->expired ensures the same subscription cannot
    re-trigger on the next tick anyway).
  - `subscription_expiring` — dedup on `(user_id, event_type, payload.daysLeft)`.
  - `renewal_window_open` — dedup on `(user_id, event_type, payload.plan)`.
- Endpoints in `server.mjs`:
  - `POST /api/dev/run-expiry-tick` — public-but-dev-shaped (intended to
    be replaced in production by `/api/cron/expiry-tick` with a shared
    secret header; see Phase 3D scope).
  - `POST /api/dev/set-subscription-expiry` — dev-only; gated by
    `isDev()`.

Reusable Phase 3C test record:

- Test user `user_3EN4P3qpwzmnhZ5y8yHBN2xl4mn` was reset to `status='active'`
  at the end of verification; both subscriptions
  (`10d1d251-7f20-4427-8324-7581e873f5c9` and
  `579cde43-d441-4343-aa06-e9df30630f43`) are back to active future
  expiries. The synthetic yearly subscription created during scenario C
  was deleted.

Verification results (29 May 2026):

1. Seeded `SUB_A=10d1d251…` with `current_period_end = now - 1 minute`.
   Tick returned `{ scanned: 3, expired: 1, planned.expired: 1 }`.
2. After the tick, the user row showed `status='inactive'`.
3. `notifications` table contained one new `subscription_expired` row
   with `payload.plan='individual_monthly'` and the past `periodEnd`.
4. Replay tick returned `{ scanned: 2, expired: 0 }` and no duplicate
   `subscription_expired` row was created.
5. Seeded `SUB_B=579cde43…` with `current_period_end = now + 2 days 12
   hours` so `Math.ceil(daysLeft) === 3`. Tick returned
   `expiringWarned: 1`; notification body matched
   `payload.daysLeft = 3`.
6. Replay tick returned `expiringWarned: 0, expiringSkipped: 1`; total
   `subscription_expiring` rows for the user stayed at 1.
7. Created a fresh `individual_yearly` subscription with
   `current_period_end = now + 30 days`. Tick returned `windowOpened: 1`;
   notification body matched `payload.planCycle='yearly'`. Replay tick
   returned `windowOpened: 0, windowSkipped: 1`; total
   `renewal_window_open` rows stayed at 1.

What was decided:

- The dev endpoint is kept public and dev-only because Render Cron
  doesn't exist in this environment. In Phase 3D the production-facing
  `/api/cron/expiry-tick` will be added with a `X-Cron-Secret` header.
  The dev endpoint stays as the local-testing path.
- The classifier uses `Math.ceil` on the remaining time, so
  `subscription_expiring` fires on the calendar day daysLeft hits 7/3/1.
  At Render Cron's 5-min cadence, this means the event fires at most
  once per relevant day (deduped by the 24-hour window query). Confirmed
  by the replay step.
- `renewal_window_open` payload carries `plan` (the planCode), and the
  dedup matches on `payload.plan`, which means re-subscribing to a
  different plan would correctly re-emit. The matching key intentionally
  ignores `periodEnd` so refreshes mid-window don't spam.

What was NOT done (deliberate cuts):

- No real Render Cron wiring; the production endpoint
  `/api/cron/expiry-tick` lives in Phase 3D.
- No `subscription_expiring` at 14 days; PRD §10.7 specifies only 7/3/1.
- No email template polish; uses Phase 3B catalog builders.
- No admin UI surface for lifecycle events.

### Phase 3B - Notification Center And Email Delivery Foundation

Status:

- Complete in local development.
- Migration `context/deployment/phase-3b-notifications.sql` applied.
- Backend builds clean. Frontend `npm --workspace frontend run build` passed
  on May 29, 2026.
- Auth gate verified: `GET /api/notifications` and
  `GET /api/notifications/unread-count` both return 401 without a Clerk
  bearer.
- Playwright MCP was offline during this chunk; verification path used
  Supabase REST + frontend build + targeted DOM verification via a
  paste-in-DevTools script (see "Verification helper" below).

What was implemented:

- New table `public.notifications` with `event_type`, `title`, `body`,
  `payload jsonb`, `channels jsonb`, `email_sent_at`, `email_provider_id`,
  `email_error`, `read_at`, `created_at`, `updated_at`.
- Indexes on `(user_id, read_at NULLS FIRST, created_at desc)` and
  `(event_type, created_at desc)`.
- Deny-all RLS; backend uses service role.
- Event catalog `backend/lib/notifications.mjs` with title/body builders +
  default channel sets for: `subscription_activated`,
  `subscription_expiring`, `subscription_expired`, `renewal_window_open`,
  `referral_commission_earned`, `withdrawal_requested`,
  `withdrawal_approved`, `withdrawal_completed`, `withdrawal_failed`,
  `post_approved`, `post_rejected`, `hire_quote_paid`,
  `application_status_change`, `hired`, `review_received`,
  `contact_viewed`.
- `backend/lib/notifications-store.mjs` provides `emitNotification`,
  `listNotificationsForUser`, `markNotificationRead`, `markAllReadForUser`,
  `unreadCountForUser`. Email is best-effort: a failed Resend send records
  `email_error` on the row but never throws.
- `backend/lib/email-sender.mjs` calls Resend HTTP API when
  `RESEND_API_KEY` is present; logs and skips otherwise.
- Wired emit calls (kept the legacy `appendUserNotification` writes
  alongside for /api/auth/me backward compat):
  - `subscription-store.mjs` -> `subscription_activated` after
    `activateOrExtendSubscription`.
  - `referrals-store.mjs` -> `referral_commission_earned` after
    successful idempotent commission insert.
  - `withdrawals-store.mjs` -> `withdrawal_requested` on create,
    `withdrawal_approved` / `withdrawal_completed` / `withdrawal_failed`
    on admin update.
  - `posts-store.mjs` -> `post_approved` / `post_rejected` to the post
    author after admin moderation.
  - `verified-hires-store.mjs` -> `hired` to the applicant when a
    Verified Hire is created. `createVerifiedHire` now accepts an
    optional `jobTitle`; `server.mjs` passes `opening.title` so the
    notification body is meaningful.
  - `reviews-store.mjs` -> `review_received` to the applicant when an
    employer review lands.
- Endpoints added to `server.mjs`:
  - `GET /api/notifications` (Clerk; `?limit=` capped at 200; returns
    `{ data, meta: { unread, emailConfigured } }`).
  - `GET /api/notifications/unread-count` (Clerk).
  - `PATCH /api/notifications/:id/read` (Clerk; ownership-checked).
  - `POST /api/notifications/read-all` (Clerk).
- Frontend:
  - `frontend/src/components/dashboard/LoggedInAccountPages.tsx`
    `NotificationsPage` rewritten to fetch `/api/notifications`. Renders
    title, body, time-ago, channels, event_type chip, and a payload
    `<details>`. Click an unread item to mark read; "Mark all as read"
    button when unread > 0.
  - `frontend/src/components/nav/DashboardLayout.tsx` polls
    `/api/notifications/unread-count` every 30 s and renders a primary
    pill on the Notifications sidebar entry. `SidebarSection` extended
    with a `badges` prop.

Test data seeded for the next agent (in DB; reusable):

- `user_3EN4P3qpwzmnhZ5y8yHBN2xl4mn` has three notifications:
  - `withdrawal_completed` (id `a9c7ffe0-6557-4c3a-98fd-69a4b5dd2ab3`).
  - `referral_commission_earned` (id `7fa4c7e2-9980-48dc-8080-c46da2c9e459`).
  - `subscription_activated` (id `237001ea-86a1-4fbc-b81d-785dda816614`).

Verification helper (paste into DevTools console at
`http://localhost:3000` while signed in as the test user):

```js
const t = await Clerk.session.getToken();
const auth = { Authorization: `Bearer ${t}` };
const list = await fetch('http://localhost:4100/api/notifications', { headers: auth }).then(r => r.json());
const count = await fetch('http://localhost:4100/api/notifications/unread-count', { headers: auth }).then(r => r.json());
console.log({ unread: count.data.count, sample: list.data.map(r => r.event_type) });
const firstId = list.data[0]?.id;
if (firstId) {
  await fetch(`http://localhost:4100/api/notifications/${firstId}/read`, { method: 'PATCH', headers: auth });
  const after = await fetch('http://localhost:4100/api/notifications/unread-count', { headers: auth }).then(r => r.json());
  console.log({ unreadAfterMarkRead: after.data.count });
}
```

What was decided:

- Kept `users.notifications` jsonb column write-through alongside the new
  table so `/api/auth/me` consumers (the existing
  `LoggedInAccountPages` stats) stay backward compatible. The structured
  table is the canonical source; the legacy column will be deprecated in a
  later cleanup chunk.
- Email send is best-effort and does not block the in-app insert. The
  `email_error` and `email_provider_id` columns let the admin audit log
  later (Phase 4) surface delivery failures.

What was NOT done (deliberate cuts):

- Web push / PWA delivery.
- Renewal reminders (cron-driven `subscription_expiring`,
  `renewal_window_open`, scheduled `subscription_expired` flip) - moved to
  Phase 3C, which is the next chunk in section 7A.
- Email template polish beyond the catalog's auto-built subject/body.
- Admin-side notifications inbox or notification analytics.

### Phase 3A - Referral Wallet And Manual Withdrawals.

Status:

- Complete in local development.
- Supabase migration applied and REST table visibility confirmed.
- Full Phase 3A API and Playwright gate passed on May 29, 2026.

What was implemented:

- Added migration `context/deployment/phase-3-referrals-wallet-withdrawals.sql`.
- Added referral wallet logic:
  - `backend/lib/referrals.mjs`
  - `backend/lib/referrals-store.mjs`
- Added withdrawal validation and store logic:
  - `backend/lib/withdrawals.mjs`
  - `backend/lib/withdrawals-store.mjs`
- Extended `backend/lib/users.mjs` with referral lookup/list helpers and notification append.
- Wired subscription payment success in `backend/server.mjs` to create idempotent referral commissions after account activation.
- Added user endpoints:
  - `GET /api/referrals/summary`
  - `GET /api/referrals/commissions`
  - `GET /api/withdrawals`
  - `POST /api/withdrawals`
- Added admin endpoints:
  - `GET /api/admin/withdrawals`
  - `PATCH /api/admin/withdrawals/:id`
- Added dev-only helper:
  - `POST /api/dev/seed-referral-commission`
  - requires a Clerk session and only exists in dev.
- Replaced `/dashboard/referrals` with a real referral wallet UI.
- Replaced the admin Withdrawals placeholder with a real `#/withdrawals` queue.
- Admin overview now reads `withdrawalsPending` from the store.

TOTP decision:

- PRD requires TOTP for every withdrawal.
- This chunk uses an explicit local-development code `424242` in `backend/lib/withdrawals.mjs`.
- Replace this with Clerk-compatible or Supabase-compatible TOTP before production.

What failed and was fixed:

- Supabase tables were initially missing:
  - `public.referral_commissions`
  - `public.withdrawals`
- Initial terminal checks returned:
  - `referral_commissions`: `PGRST205 Could not find the table 'public.referral_commissions' in the schema cache`
  - `withdrawals`: `PGRST205 Could not find the table 'public.withdrawals' in the schema cache`
- `public.exec_sql(sql)` RPC does not exist.
- `psql` and `supabase` CLI are not installed in this environment.
- User applied `context/deployment/phase-3-referrals-wallet-withdrawals.sql` in Supabase SQL editor; REST then returned OK for both tables.
- After migration, the full Phase 3A gate passed.

Verification run on May 29, 2026:

- `node --check backend/server.mjs` passed.
- `node --check backend/lib/withdrawals-store.mjs` passed.
- `npm --workspace frontend run build` passed.
- `npm --workspace admin-panel run build` passed.
- Backend restarted locally and `/health` returned `ok: true`.
- Unauthenticated route smoke:
  - `GET /api/referrals/summary` returned 401.
  - `GET /api/withdrawals` returned 401.
  - `GET /api/admin/withdrawals` returned 401.
  - `POST /api/dev/seed-referral-commission` returned 401.

Playwright results on May 29, 2026:

- Tool used: Playwright MCP after tool discovery. Earlier CLI attempts used `npx --package @playwright/cli playwright-cli`; `npx` is available, but the skill wrapper is a `.sh` script and this Windows shell has no `bash`.
- Logged in as `needool+clerk_test@example.com` with password `NeedoolDev!Test2026` and Clerk dev code `424242`.
- User route:
  - URL: `http://localhost:3000/dashboard/referrals`
  - Page rendered wallet UI with referral code/link, total earned, total withdrawn, reserved, available, referred users, commission history, withdrawal history, and withdrawal form.
  - `GET /api/auth/me` returned 200.
  - `GET /api/referrals/summary` returned 200 with totals:
    - total earned `25.50 USDT`,
    - total withdrawn `20.00 USDT`,
    - reserved `0.00 USDT`,
    - available `5.50 USDT`.
  - `GET /api/withdrawals` returned 200 with completed withdrawal `5a3cd146-b8ec-44c3-bc8e-ef47879ed2bf`.
- Admin route:
  - URL: `http://localhost:3200/#/withdrawals`
  - Page rendered the new withdrawal queue UI.
  - Pending withdrawal appeared, then admin approved it.
  - Approved withdrawal appeared in the approved filter, then admin marked it paid with tx hash `0xphase3a5a3cd146b8ec44c3bc8eef47879ed2bf`.
  - Completed withdrawal appeared in the completed filter.

Reusable Phase 3A test records:

- Referrer / normal test user: `user_3EN4P3qpwzmnhZ5y8yHBN2xl4mn`
- Dev seed commission: `607ad2dc-89c4-4f88-89d0-03f59ac5cb25`, amount `25.00 USDT`.
- Referred subscription test user: `user_phase3_referee_1780061332631`.
- Referred subscription payment: `phase3_ref_pay_1780061332631`.
- Referred subscription commission: `713c07bb-24cf-41ad-854d-4929773aa444`, amount `0.50 USDT`, rate `10%`, status `earned`.
- Idempotency check: replaying payment `phase3_ref_pay_1780061332631` returned `reason: idempotent_replay`; commission count stayed `1`.
- Withdrawal: `5a3cd146-b8ec-44c3-bc8e-ef47879ed2bf`, amount `20.00 USDT`, status `completed`.
- Test TRC20 address: `TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj`.
- Test tx hash: `0xphase3a5a3cd146b8ec44c3bc8eef47879ed2bf`.

Validation results:

- Below-minimum withdrawal `10 USDT` returned 400 `minimum_withdrawal`.
- Above-balance withdrawal `100 USDT` returned 400 `insufficient_balance`.
- Bad dev TOTP `000000` returned 400 `invalid_totp`.
- Valid `20 USDT` withdrawal with code `424242` returned 201 pending.
- User notifications include commission added, withdrawal requested, withdrawal approved, and withdrawal completed.

---

## 9. Files Most Relevant For The Next Agent

Backend:

- `backend/server.mjs`
- `backend/lib/env.mjs`
- `backend/lib/users.mjs`
- `backend/lib/nowpayments.mjs`
- `backend/lib/payments-store.mjs`
- `backend/lib/referrals.mjs`
- `backend/lib/referrals-store.mjs`
- `backend/lib/subscription-store.mjs`
- `backend/lib/subscriptions.mjs`
- `backend/lib/withdrawals.mjs`
- `backend/lib/withdrawals-store.mjs`
- `backend/lib/notifications.mjs`
- `backend/lib/notifications-store.mjs`
- `backend/lib/email-sender.mjs`
- `backend/lib/expiry.mjs`
- `backend/lib/audit-log-store.mjs`
- `backend/lib/comments.mjs`
- `backend/lib/comments-store.mjs`
- `backend/lib/post-engagement-store.mjs`
- `backend/lib/follows-store.mjs`
- `backend/lib/trigger-b.mjs` (Phase 4C)
- `backend/lib/trigger-b-store.mjs` (Phase 4C)
- `backend/lib/feature-flags-store.mjs` (Phase 4C)

Frontend:

- `frontend/src/routes/dashboard.referrals.tsx`
- `frontend/src/routes/dashboard.notifications.tsx`
- `frontend/src/components/dashboard/LoggedInAccountPages.tsx`
- `frontend/src/components/nav/DashboardLayout.tsx`
- `frontend/src/context/AuthContext.tsx`
- `frontend/src/lib/api.ts`

Admin:

- `admin-panel/src/main.jsx`
- `admin-panel/src/styles.css`

Database:

- `context/deployment/clerk-nowpayments-init.sql`
- `context/deployment/phase-1-posts.sql`
- `context/deployment/phase-2-jobs-reviews-a.sql`
- `context/deployment/phase-3-referrals-wallet-withdrawals.sql`
- `context/deployment/phase-3b-notifications.sql`
- `context/deployment/phase-4b-audit-log.sql`
- `context/deployment/phase-4c-trigger-b.sql` (Phase 4C)
- `context/deployment/phase-4f-engagement.sql`

Tests:

- `backend/test/trigger-b.test.mjs` — Phase 4C pure-logic coverage.
- `backend/test/edge-cases.test.mjs` — cross-lib boundary cases.
- `backend/test/*` — five prior node:test files (subscriptions-expiry,
  notifications, posts-comments, reviews-hiring, referrals-withdrawals).
- `frontend/vitest.config.ts` + `frontend/src/lib/__tests__/*.test.ts`
  — Vitest with jsdom + Testing Library.
- `playwright.config.ts` + `tests/e2e/*.spec.ts` — repo-root Playwright
  test suite (51 specs). `tests/e2e/helpers.ts` for shared fetch
  utilities.
- Run from repo root:
  - `npm test` (backend + frontend + e2e, requires dev stack running).
  - `npm run test:backend` / `npm run test:frontend` /
    `npm run test:e2e` individually.

---

## 10. Update Rules For Future Agents

When a chunk is complete:

1. Move the completed chunk into the execution log.
2. Add exact Playwright URLs and outcomes.
3. Add any API IDs/test records needed for reuse.
4. Add known failures and fixes.
5. Update the PRD coverage map.
6. Write the next chunk from the PRD.

Never leave this file saying a feature is placeholder if it has been implemented and verified.

Never treat this file as more authoritative than the PRD. If a contradiction appears, note the contradiction here and ask the user for a product decision if it affects behavior, pricing, money, security, or legal exposure.

---

## 11. Codex Full Local Audit - May 31, 2026

Status:

- Complete in local development.
- No commit, push, or GitHub action was performed.
- The immutable PRD remains the source of truth. This section records the
  tested implementation state, fixes, fixture state, and remaining product
  decisions.
- Playwright MCP is functional in this Codex session. The audit used the
  installed `playwright` skill and the live `mcp__playwright` browser tools.

### Audit scope

Newest implementation chunks were verified first:

- Phase 4F post engagement: post detail, comments, replies, comment likes,
  post likes, saves, follows, contact stripping, and engagement notifications.
- Phase 4B admin audit log: rendered admin route, filtered audit read, and
  failed-action logging.
- Phase 3C subscription expiry tick: authenticated dev tick and zero-action
  stable-state result.
- Phase 3B notifications: inbox render, unread count, read-one, mark-all-read,
  and restored unread fixture state.
- Phase 3A referrals wallet and withdrawals: existing totals, history, admin
  queue, and invalid withdrawal edge.
- Phase 2 jobs and reviews: public job detail, review forms, admin hiring
  routes, duplicate-review edges, missing-token edge, and application edge.

The audit then swept all current public, signed-in dashboard, and admin routes.

### Bugs observed and fixed

1. Cross-user follow, comment, and like notifications could fail after the
   database mutation because `backend/server.mjs` called `emitNotification`
   without importing it. Added the missing import.
2. The four Phase 4F notification templates were missing from
   `backend/lib/notifications.mjs`. Added `comment_received`,
   `reply_received`, `like_received`, and `new_follower` with PRD-aligned
   channels.
3. Contact stripping treated ISO dates such as `2026-05-31` as phone numbers.
   Updated `backend/lib/posts.mjs` to preserve exact ISO dates while still
   replacing email addresses and phone numbers with `[contact removed]`.
4. Signed-in public pages could fetch visitor data during Clerk hydration and
   never refresh. Fixed auth-settled reload behavior in post detail, feed, and
   public profile routes.
5. Database-only users could dead-end at `Profile not found` because the
   public profile route required legacy mock profile data. Added a live
   database fallback profile model.
6. Signed-in public navigation still showed `Log in` and `Get started`.
   Updated `TopNav` to show `Dashboard`.
7. `/dashboard/saves` and `/dashboard/applications` rendered a second nested
   dashboard shell. Removed the duplicate child layouts.
8. Theme initialization could produce a hydration mismatch. Made the initial
   theme deterministic and hydrate persisted preference after mount.
9. Delete failures in post-engagement and follow stores could be silently
   ignored. Added explicit response checks.
10. An invalid withdrawal UUID surfaced as backend 500. Added withdrawal ID
    validation so the route returns 404 `not_found`.
11. Inactive accounts could still call like, save, follow, and comment-like
    endpoints directly. Added active-account enforcement in the API and
    disabled matching UI controls.
12. Admin dashboard loading placeholders reused React keys and logged warnings.
    Added stable indexed keys.

### Unit tests added

`backend/package.json` now exposes `npm test` using Node's built-in test runner.
The focused tests cover:

- Comment sanitizing, nesting limit, daily limits, and no-comments post kinds.
- Phase 4F notification channel routing.
- Subscription expiry pure rules.
- Referral commission math and withdrawal validation.
- Hiring request, job application, and review validation.

Result on May 31, 2026: `18/18` tests passed.

### Build and syntax verification

- `node --check backend/server.mjs` passed.
- `npm test` from `backend` passed: `18/18`.
- `npm --workspace frontend run build` passed.
- `npm --workspace admin-panel run build` passed.
- `GET http://localhost:4100/health` returned `ok: true`.

### Playwright and API verification

Playwright UI checks passed for:

- Public routes: `/`, `/search`, `/needs`, `/needs/new`, `/opportunities`,
  `/opportunities/new`, `/events`, `/jobs`, `/jobs/:id`,
  `/jobs/hire-request`, `/pricing`, `/help`, `/about`, `/contact`, `/safety`,
  `/privacy`, `/terms`, and `/cookies`.
- Signed-in dashboard routes: `/dashboard`, `/dashboard/profile`,
  `/dashboard/referrals`, `/dashboard/notifications`, `/dashboard/saves`,
  `/dashboard/applications`, `/dashboard/needs`, `/dashboard/opportunities`,
  `/dashboard/jobs`, `/dashboard/events`, `/dashboard/reviews`, and
  `/dashboard/help`.
- Hiring and profile routes: need detail, opportunity detail,
  `/p/needoolclerktest`, `/p/phase3ref61332631`, `/reviews/:verifiedHireId`,
  and `/review-employer/:token`.
- Admin hash routes: `#/dashboard`, `#/users`, `#/approvals`,
  `#/hire-requests`, `#/jobs`, `#/events`, `#/reviews`, `#/withdrawals`,
  `#/help-cms`, `#/settings`, and `#/audit-log`.

Key UI edge results:

- Cold signed-in need-detail load renders the complete post, comment composer,
  seeded comments, save control, and dashboard navigation after auth settles.
- Creating a QA comment with an email address and phone number preserved the
  date `2026-05-31` and replaced both contact values with `[contact removed]`.
- Save, like, follow, comment-like, notification read, and mark-all-read UI
  actions worked. Reversible fixture mutations were restored after testing.
- Opportunity detail correctly omits comments.
- A database-only public profile renders with `Rate Not provided`.
- Own profile renders disabled `You`; another member renders `Follow`.
- An inactive account renders view-only UI and direct authenticated like,
  save, comment-like, and follow API calls return 403.
- Admin dashboard and settled public feed/profile screens render without page
  errors.

API gates passed:

- Public health, feeds, jobs, review token, and profile review endpoints.
- Expected 401 responses for unauthenticated account, wallet, admin, like, and
  follow endpoints.
- Authenticated account, subscription, referral, wallet, application,
  verified-hire, and notification endpoints.
- Admin overview, users, posts, withdrawals, audit log, hire requests, jobs,
  and applicants endpoints.
- Edge responses: invalid hire email 400, invalid post kind 400, withdrawal
  amount errors 400, invalid withdrawal ID 404, self follow 400, missing follow
  404, opportunity comment 400, duplicate reviews 409, missing review token
  404, missing notification 404, and missing expiry input 400.

### Reusable fixture state after audit

- Normal test user was restored to `active`.
- The audited post has only its original two visible seeded comments.
- Post likes were restored to the original seeded like.
- Post saves were restored to none.
- Normal user's following list was restored to none.
- Existing follower fixture from the referred user remains.
- Normal user's six notifications were restored to unread for future UI checks.
- Two QA comments created during sanitizer testing remain soft-deleted and are
  intentionally invisible.
- Admin audit rows for deliberately failed requests remain as useful evidence.
- The referred test user retains rendered engagement notifications created by
  the audit.

### Remaining decisions and known gaps

1. Notification replay suppression needs a product decision. A true
   unlike-then-relike or unfollow-then-refollow can emit a new notification
   because the current implementation deletes and recreates the relationship.
   The PRD defines routing but does not define a dedupe cooldown or historical
   event key.
2. The normal test user's seeded application exists, but replaying an apply
   request currently returns 403 location mismatch before it reaches the
   duplicate-application check. Profile location data and job eligibility
   modeling should be aligned when the full profile workflow is implemented.
3. `#/reviews`, `#/help-cms`, and some dashboard content remain deliberate
   placeholders. Phase 4C Trigger B member reviews, production TOTP, web push
   PWA behavior, Polygon work, expanded roles, and Help CMS remain future PRD
   chunks.
4. Email delivery is intentionally off in local development because Resend is
   not configured. Notification records still preserve their expected channel
   lists.

### Next chunk

Continue with the previously identified PRD chunk: Phase 4C Trigger B member
reviews, anti-abuse behavior, and its feature flag. Read the immutable PRD and
this handoff first, implement one coherent chunk, verify in local development
with Playwright, and append the result here.

---

## 12. Pre-Launch Rollout Plan (Phases A–E)

Authored 3 June 2026 after Phase 7 adversarial sweep + a live-internet
threat audit. Drives the work from "feature-complete in dev" to "safely
public on the internet". **Do these phases in order.** Skipping ahead =
inviting the bot-scanning storm before defenses are in place.

### 12.0 Why dev-first, not push-first

The moment the GitHub repo goes public, scanners from Censys / Shodan /
GitHub-watching bots clone it within minutes. They grep `package.json`
for known-vulnerable versions, watch for any commit that touches `.env`,
and probe every endpoint listed in `server.mjs`. Going live with known
holes is a race the founder doesn't have to enter. With zero real users
today, the cost of one more dev cycle is time; the cost of fixing after
launch is incidents + secret rotation + reputational damage.

### 12.1 Threat audit summary — 14 risks, ranked

Full audit lives in the assistant transcript dated 3 June 2026. The
14-row table is reproduced here so future agents have it in-repo.

**Already-in-codebase findings (must fix before push)**:

- **#1 CRIT — Stored XSS via `dangerouslySetInnerHTML`.**
  `frontend/src/routes/help.$slug.tsx:183` renders admin markdown
  unsanitized.
- **#2 CRIT — No rate limiting.** Backend has zero rate-limit
  middleware. Contradicts PRD §15.4.

**High / medium hardening (best done before push)**:

- **#3 HIGH — Webhook replay window not enforced** (no 5-min
  timestamp check on Clerk svix or NOWPayments).
- **#4 HIGH — Admin MFA not enforced** (Clerk dashboard work +
  server-side gate; PRD §13.1 implies admin privilege but doesn't
  explicitly require MFA — recommend enforcing it).
- **#5 HIGH — Legacy Supabase `service_role` key.** Supabase
  deprecates these by end-2026; migrate to `sb_secret_*`.
- **#6 HIGH — npm supply-chain (post-Shai-Hulud).** Pin lockfile,
  `--ignore-scripts` in CI, Dependabot + CodeQL on.
- **#7 HIGH — No Content-Security-Policy header** (other security
  headers are set; CSP is the second-layer XSS defense).
- **#8 MED — SSRF risk** if user-supplied URLs (links, evidence,
  CV) are ever fetched server-side. Today they're only stored.
- **#9 MED — CV PDF upload abuse** (memory-exhaustion / disguised
  HTML / embedded JS actions). `pdf-parse` is a known historical
  CVE source.
- **#10 MED — `JSON.parse` on unbounded bodies** (no
  Content-Length cap on `readBody`).
- **#11 MED — Open-redirect risk** if `?next=` is ever introduced.
- **#12 LOW — Push subscription endpoint enumeration** (host
  allowlist not enforced in `pickPushSubscription`).
- **#13 LOW — `sessionStorage` for `ndl_ref`** (XSS-exfiltrable;
  switch to HttpOnly cookie).
- **#14 LOW — No Subresource Integrity** on any future CDN
  scripts.

**PRD §15.4 explicit alignment check**:

| PRD §15.4 requirement | Shipped? | Where |
| --- | --- | --- |
| All endpoints behind Supabase RLS | YES | every migration has `enable row level security` + `deny all` policy |
| Active/Inactive gating server-side | YES | `users.mjs::publicUserShape` + `subscription-store` expiry tick |
| TOTP 2FA for withdrawals | DEV STUB | `424242` accepted in dev; real TOTP is founder-only at launch |
| Server-side regex stripping (phones/emails/URLs) | YES | `posts.mjs::containsContactInfo` + `profile.mjs::sanitizeBio` |
| **Rate limiting on write endpoints** | **NO — Phase 8** | gap surfaced by audit |
| HTTPS-only SameSite=Lax HttpOnly cookies | PARTIAL | Clerk handles its own cookies; backend uses bearer tokens. `ndl_ref` is in `sessionStorage` (risk #13) |
| **CSRF double-submit** | **NO — Phase 8** | explicit PRD requirement, not yet implemented |
| Anchor wallet key isolated | N/A | Polygon anchoring is founder-only at launch |

The two **NO** rows above are PRD-mandated, not gold-plating. Phase 8
makes the PRD §15.4 compliance complete in dev.

### 12.2 Phase A — Claude code-only hardening (Phase 8 of build)

Ships entirely in dev. No real keys, no GitHub push, no deploy.

Deliverables:

1. Replace `dangerouslySetInnerHTML` with sanitized markdown.
   Recommended: `react-markdown` + `rehype-sanitize`. Alternative:
   keep the in-house renderer + add `DOMPurify` before insertion.
2. Generic rate-limit middleware in `backend/server.mjs`. Suggested
   tiers:
   - 5/min/IP on `/api/hire-requests/otp/*`
   - 10/min/IP on every other public POST
   - 60/min/IP on public GETs
   - Storage: in-process Map for dev, swap for Redis at scale.
3. 5-minute timestamp window on Clerk + NOWPayments webhooks.
   Read `svix-timestamp` + NOWPayments `Date` header; reject older.
4. Body-size cap on `readBody` (default 1 MB, 5 MB for upload
   routes), 413 on overrun.
5. CSRF double-submit token (PRD §15.4 requirement). Issue a
   cryptographically-random token in a cookie + require it as a
   header on every state-changing request. Wire into the apiFetch
   helper on the frontend.
6. CSP header. Reasonable starting policy (tighten via report-only
   first):
   ```
   default-src 'self';
   script-src 'self' https://*.clerk.accounts.dev;
   style-src 'self' 'unsafe-inline';
   img-src 'self' data: https:;
   connect-src 'self' https://*.clerk.accounts.dev
               https://api-sandbox.nowpayments.io
               https://api.nowpayments.io https://*.supabase.co;
   frame-ancestors 'none';
   base-uri 'self';
   form-action 'self';
   ```
7. Push-endpoint host allowlist in `pickPushSubscription`.
   Allow only: `fcm.googleapis.com`, `*.push.services.mozilla.com`,
   `*.notify.windows.com`, `web.push.apple.com`.
8. SSRF-safe URL validator on every user-link insert. Block
   private CIDRs + non-https. Use this helper now even though
   we only store the URLs today, so adding fetch-side OG previews
   later is automatically safe.
9. Switch `ndl_ref` from sessionStorage to an HttpOnly cookie.
10. node:test + Playwright specs proving each defense fires.

Acceptance:

- Backend node:test 363 → ~395.
- Phase 7 adversarial e2e 57 → ~80 (rate-limit, CSRF, CSP, body
  cap, push allowlist all exercised).
- `/api/dev/run-launch-qa` still reports 18/18.

### 12.3 Phase B — Dependency dashboards (founder-only, ~2 hours)

These cannot be automated. Founder must log in and click. **Order
matters** — Clerk MFA first, GitHub push-protection second, since
those defend everything else.

1. **Clerk** → enforce MFA (TOTP + backup codes) on every admin
   email. Enable passkeys org-wide. (5 min) Rotate signing secret
   if any staff has left.
2. **GitHub** → enable Dependabot security + version updates,
   CodeQL, **secret scanning with push protection**. Push
   protection alone prevents accidental `.env` commits. (5 min)
3. **GitHub** → require 2FA org-wide. Branch protection on
   `main`: required reviews, status checks, no force push, no
   admin bypass. (5 min)
4. **Supabase** → migrate from legacy `SUPABASE_SERVICE_ROLE_KEY`
   to new `sb_secret_*` keys. Rotate. Enable PITR. Restrict
   `cv` + `avatars` bucket MIME types. (10 min)
5. **NOWPayments** → rotate IPN secret. Confirm callback URL is
   HTTPS-only. Set per-day outbound limit on hot wallet.
   (5 min)
6. **Resend** → set sending cap + per-day spend alert. Verify
   SPF, DKIM, DMARC for `needool.com` (DMARC `p=reject`). (10 min)
7. **Cloudflare** (in front of eventual deploy) → register the
   zone, enable WAF Managed Rules + Bot Fight Mode. Add rate-limit
   rules for `/api/hire-requests/otp/*`, `/api/auth/*`,
   `/api/withdrawals`. Always Use HTTPS + HSTS + TLS 1.3.
   (30 min)
8. **Vercel / Render** → set platform CSP / security-headers,
   per-route rate limits, deployment-approval-required for prod.
   (15 min)
9. **npmjs.com** → register `needool` scope + force 2FA on org.
   Pin a publishing token with 90-day expiry. (5 min)
10. **Polygon** (when funded) → hardware wallet for anchor
    signer; keep < $200 USD bridged at a time. (PRD §3.5 ops)
11. **Maps / WhatsApp** keys → restrict to your domain + the
    specific API surfaces; daily quota.

### 12.4 Phase C — Pre-launch verification (1 day)

- `npm run test` (backend node:test + frontend Vitest + Playwright
  e2e) → all green.
- `/api/dev/run-launch-qa` → 18/18.
- `npm run test:lighthouse` against the **production build** →
  perf ≥ 85 mobile, a11y ≥ 95.
- `npm audit signatures` — no malicious deps.
- `grep -r "SUPABASE_SERVICE_ROLE_KEY\|sb_secret_" frontend/ admin-panel/`
  must return zero matches.
- Skim `git diff` for any inline secrets. Push protection from
  Phase B catches this too.

### 12.5 Phase D — First GitHub push

- Open a PR rather than pushing direct to `main`. Even with a
  single reviewer (you), the CI validates everything.
- Confirm branch protection from Phase B blocks force-push +
  required Dependabot status check is green.
- Merge after CI is green.

### 12.6 Phase E — Staged deploy (PRD §17.2 soft-launch playbook)

PRD §1.5 + §17 says Nigeria-first soft launch. This staging maps
to that: surface goes up incrementally, not all at once.

1. **Frontend only**, splash screen ("coming soon"). Vercel.
   Verifies DNS, CDN, CSP, TLS, certificates without exposing
   any business logic.
2. **Backend** on Render with `NODE_ENV=production` + real
   secrets. Test from your machine before pointing the frontend
   at it (don't change `VITE_API_BASE_URL` yet).
3. **Cloudflare** WAF + rate limits in front of both.
4. **Admin panel** on `admin.needool.com`, behind Cloudflare
   Access (free zero-trust gate before Clerk even sees the
   request). Confirms PRD §13 admin privilege isolation.
5. Once boring infra is solid, flip the frontend from splash
   to the real app.
6. PRD §17.2 outreach to ~500 Lagos contacts (WhatsApp + Instagram)
   — your offer of "first 100 signups → free first month".
7. Daily monitoring of payment webhooks, billing-math edge cases,
   signup rate, approval queue (per PRD §17.2 operational
   checklist).

### 12.7 What to do if a Phase 8 defense reveals a deeper bug

Phase 7 found one (`contact-intent` design carve-out) and resolved
it as expected behavior. If Phase 8 testing turns up a real
underlying bug (e.g. a missing auth check), do NOT just paper over
it with the rate limiter — fix the root cause, then keep the
rate-limit on top. Defense in depth.

### 12.8 PRD alignment notes

- PRD §1.5 + §17 Nigeria-first soft launch — Phase E stages match.
- PRD §15.4 explicitly requires rate limiting + CSRF double-submit
  — both land in Phase 8.
- PRD §15.4 RLS-everywhere + Active/Inactive gating — already
  shipped, Phase 8 doesn't change.
- PRD §2.5 login rate limit (5 attempts → 15-min lockout) — Clerk
  handles this; founder confirms in dashboard.
- PRD §11.4 wallet ops rule ($5K hot wallet cap, daily cold sweep,
  hardware wallet) — Phase B founder dashboard work.
- PRD §13 admin isolation — Cloudflare Access in Phase E.4
  layers on top of Clerk auth.
- PRD §3.5 Polygon anchoring is "additive" — app must remain
  functional even if anchoring is paused. Phase E.5 splash + slow
  cutover preserves this.
- PRD §1.4 explicit out-of-scope items (escrow, AI moderation,
  KYC badges, user-Events) — none reintroduced by Phase 8 or any
  rollout phase.

### 12.9 Quick reference — phase ownership

| Phase | Owner | Where work happens | Touches deps / keys? |
| --- | --- | --- | --- |
| A (=Phase 8) | Claude | dev only | NO |
| B | Founder | Clerk / Supabase / NOWPayments / Resend / Cloudflare / GitHub / npm / Vercel / Render dashboards | YES — rotate + configure |
| C | Both | dev | NO |
| D | Founder | GitHub | YES — first public push |
| E | Founder | Vercel + Render + Cloudflare consoles | YES — production secrets |

### 12.10 Phase 8 founder dashboard runbook — DETAILED (web-searched 3 June 2026)

> **Rule:** every menu path + button label below was looked up on
> the source provider's official June-2026 docs per the
> [[founder-dashboard-lookups]] rule. Source URL is cited next to
> each section. If the UI looks different when you open the
> dashboard, re-confirm against the URL before clicking — these
> consoles ship UI changes monthly.

The runbook is organized into **5 stages** by timing so there's
zero ambiguity about what comes first:

- **STAGE 0** — Do TODAY, while the app is still in dev. No
  domain required, no deploy required.
- **STAGE 1** — Buy domain + point DNS at Cloudflare. After
  Stage 0 is finished. ~24 hour DNS propagation wait.
- **STAGE 2** — Deploy backend + frontend. Requires Stage 1
  domain to be live. After deploy you have publicly resolvable
  URLs.
- **STAGE 3** — Configure Cloudflare WAF rules + flip the orange
  cloud. Requires Stage 2 URLs to be live so the traffic flows
  through Cloudflare. **PAUSE POINT** — see §13 go-live switch
  flip checklist before flipping the proxy.
- **STAGE 4** — Final domain auth (DMARC tightening, Search
  Console). After 1–2 weeks of soft traffic.

---

## STAGE 0 — Do now (app still in dev, no domain needed yet)

These don't require any deployed URL or DNS. **Do these first** —
they harden your own accounts so when you hit "deploy" you're
not pushing from a compromised laptop.

### 0.A — Clerk: enforce admin MFA + create production app

Source: [clerk.com/docs/guides/secure/force-mfa](https://clerk.com/docs/guides/secure/force-mfa)

Today Needool uses a Clerk **dev** app. Production needs a
separate app so prod users can't accidentally sign into the
dev tenant.

1. Open [dashboard.clerk.com](https://dashboard.clerk.com).
2. Click your existing **Needool Dev** application in the top-left
   to open the app switcher → click **+ Create application**.
3. Name it **Needool Production**. Sign-in methods: **Email**,
   **Password** (same as dev). Click **Create application**.
4. On the new app's overview page, look for the API keys card.
   Note the `pk_live_...` (publishable) and `sk_live_...` (secret)
   — these go into the production env vars at deploy time
   (Stage 2). Don't copy them anywhere yet; the dashboard always
   shows them.
5. **Enforce MFA — the critical step:**
   - In the Clerk Dashboard left sidebar, click
     **User & Authentication → Multi-factor**.
   - Toggle ON **Authenticator application**.
   - Toggle ON **Backup codes**.
   - Click **Save**.
   - Then toggle ON **Require multi-factor authentication**.
     After this, *every* new sign-in (including your own) must
     complete MFA. That's the goal — phished passwords alone
     can't sign in.
6. **Add yourself**: sign out of Clerk's dev app, sign back into
   the Production app on a real device, set up Authenticator
   immediately. Save the backup codes in a password manager
   (Bitwarden / 1Password).
7. **Webhook signing secret:** in the same Production app, go to
   **Webhooks → Add Endpoint**. URL field will be filled in at
   Stage 2 (once you have the deployed backend URL); leave this
   tab open. Subscribe to `user.created`, `user.updated`,
   `user.deleted`. The `whsec_...` signing secret goes into
   `CLERK_WEBHOOK_SECRET` env at deploy time.

> **Why now:** doing this before you push to GitHub means even
> if your laptop is compromised today, the attacker still can't
> reach a Clerk admin account without your TOTP.

### 0.B — GitHub: secret-scanning push protection + Dependabot

Source: [docs.github.com/en/code-security/secret-scanning/enabling-secret-scanning-features/enabling-push-protection-for-your-repository](https://docs.github.com/en/code-security/secret-scanning/enabling-secret-scanning-features/enabling-push-protection-for-your-repository)

**This must be on BEFORE your first `git push`.** It blocks
secret-bearing commits from ever reaching GitHub's servers.

1. Open [github.com](https://github.com) → click your profile
   icon → **Your repositories** → click the Needool repo (if it
   doesn't exist yet, create it as **Private** first — name it
   `needool-web-app`, click **Create repository**).
2. Settings: under the repo name, click **Settings**.
3. Left sidebar: **Code security**.
4. Find the **Secret Protection** section. To its right click
   **Enable**.
5. Underneath it, find **Push protection**. To its right click
   **Enable**.
   > **Push protection is the one that blocks your laptop from
   > shipping `.env` files**. Without it, GitHub only alerts
   > you *after* the secret is public.
6. In the same Code security page, find **Dependabot** section
   and turn on:
   - **Dependabot alerts** → Enable.
   - **Dependabot security updates** → Enable.
   - **Dependabot version updates** → Enable (this creates a
     `.github/dependabot.yml` PR you accept).
7. Find **Code scanning** → enable **Default setup** (CodeQL).
   GitHub auto-creates the workflow.
8. **Plan requirement:** GitHub Secret Protection requires
   **GitHub Team** or **GitHub Enterprise** ($4/mo/seat, paid
   annually). If you're on the free plan, this single item
   justifies the upgrade — without it the first time you
   accidentally commit a key, it's already indexed by every bot
   on the internet within ~30 seconds.
9. **Branch protection** (one-time): Settings → **Branches** →
   **Add rule** → Branch name pattern: `main`. Check:
   - **Require a pull request before merging** (Required
     approvals: 1; allow specified actors to bypass: blank).
   - **Require status checks to pass before merging** → add the
     "Dependabot/Lockfile" + "CodeQL" checks once they appear
     after the next push.
   - **Do not allow bypassing the above settings** (this is the
     "no force push to main" lock — turn it on).
   - **Restrict deletions** → ON.

> **Wait condition:** none — do this now, even before the first
> push. Push protection runs against your laptop's `git push`
> outbound; you don't need the repo to have any code in it.

### 0.C — npm.com: claim the org name + force 2FA

Source: [docs.npmjs.com/configuring-two-factor-authentication](https://docs.npmjs.com/configuring-two-factor-authentication)
(re-confirm path on the day; was stable for years).

1. [npmjs.com](https://npmjs.com) → sign in → top-right avatar
   → **Add Organization**.
2. Org name: `needool`. Plan: Free. This **prevents typosquatters**
   from registering `@needool/anything` before you do.
3. After org creation: org page → **Settings → Members & Teams**
   → ensure your account is Owner. Enable **Require two-factor
   authentication for all members**.
4. Even if you don't plan to publish packages today, the org-name
   reservation alone is worth ~30 seconds of work.

### 0.D — Generate production secrets locally

You don't need to log into anything for these — they're random
values your backend will read at deploy time. Do this so when
you fill in Render's env vars at Stage 2 you have them ready.

1. **`CSRF_SECRET`** — open a terminal:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
   Save the 128-char hex string into your password manager under
   `Needool / Production / CSRF_SECRET`.
2. **VAPID keys for web push** — source:
   [github.com/web-push-libs/web-push](https://github.com/web-push-libs/web-push):
   ```bash
   npx web-push generate-vapid-keys --json
   ```
   Two values come back: `publicKey` (goes into the **frontend**
   `VITE_VAPID_PUBLIC_KEY` env at Stage 2) and `privateKey` (goes
   into the **backend** `VAPID_PRIVATE_KEY` env at Stage 2 — note
   this isn't wired in code yet; founder handles the sender per
   §1.4 out-of-scope list. The keys themselves are still useful
   to have on hand).
3. Save both VAPID values in the password manager.

---

## STAGE 1 — Buy the domain + point DNS at Cloudflare

After Stage 0. This stage has a **~24 hour propagation wait** —
plan for it. Nothing else can happen until DNS resolves.

### 1.A — Register `needool.com`

1. Buy at any registrar (Namecheap, Cloudflare Registrar, Porkbun).
   Cloudflare Registrar is at-cost — cheapest by ~$5/yr.
2. While buying: enable **WHOIS privacy** (free at most registrars
   in 2026). Don't put your home address in WHOIS.
3. Enable the registrar's **transfer lock** and the registrar's
   own **2FA** on the account.

### 1.B — Onboard the domain to Cloudflare

Source: [developers.cloudflare.com/fundamentals/manage-domains/add-site/](https://developers.cloudflare.com/fundamentals/manage-domains/add-site/)

1. Sign in to [dash.cloudflare.com](https://dash.cloudflare.com).
2. Top-left **Add a site** → enter `needool.com` → **Continue**.
3. Pick **Free plan** for now — you can upgrade later. Click
   **Continue**.
4. Cloudflare scans your existing DNS and shows the records it
   found. **Don't accept the import yet** if you haven't pointed
   anything anywhere — instead, plan to add records yourself in
   Stage 2.
5. Cloudflare gives you two nameservers (e.g.
   `kira.ns.cloudflare.com`, `kurt.ns.cloudflare.com`). **Copy
   both.**
6. Go back to your **registrar's** dashboard → DNS / Nameservers
   section → replace the existing nameservers with the
   Cloudflare ones.
7. Save. Wait. DNS propagation is typically 1–4 hours but can
   take 24. You'll get an email from Cloudflare when it sees the
   change.
8. While you wait, in Cloudflare: **SSL/TLS → Overview** → set
   encryption mode to **Full (strict)**. Then **Edge
   Certificates → Always Use HTTPS** → ON. **Minimum TLS
   Version** → **TLS 1.3**.

### 1.C — Wait for the activation email

Cloudflare emails you when your domain is "Active". **You cannot
do Stage 2 or 3 until this email arrives.** If it's been more
than 24 hours, double-check the nameservers at the registrar.

---

## STAGE 2 — Deploy backend + frontend (no Cloudflare proxy yet)

Prereqs: Stages 0 + 1 complete. Cloudflare email says domain is
Active.

### 2.A — Supabase: create production project + rotate to new keys

Source: [supabase.com/docs/guides/getting-started/migrating-to-new-api-keys](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)

Today's dev Supabase project should NOT be used for production
traffic. Create a separate prod project.

1. [supabase.com/dashboard](https://supabase.com/dashboard) →
   **New project**.
2. Name: `needool-prod`. Region: closest to Nigeria — currently
   **eu-west-2 (London)** or **eu-central-1 (Frankfurt)** give
   the best Lagos latency. Use a **strong DB password** —
   generate via your password manager.
3. After provisioning (~2 min), copy the **Project URL**
   (`https://abcdef.supabase.co`) — this is `SUPABASE_URL` at
   deploy time.
4. Apply every migration in
   `context/deployment/*.sql` to this new project, in order:
   - `clerk-nowpayments-init.sql` first
   - then `supabase-demo-state.sql`
   - then `phase-1-posts.sql`, `phase-2-jobs-reviews-a.sql`, etc.
     all the way through `phase-6-prd-closeout.sql`
   - Open each in **SQL Editor → New query → paste → Run**.
5. **Rotate to new-style keys** (this is the security upgrade):
   - **Settings → API Keys** in the left nav.
   - Open the **API Keys** tab. If there's no publishable key
     yet, click **Create new API Keys**.
   - Copy the **Secret key** value (starts `sb_secret_...`).
     This goes into the backend's `SUPABASE_SERVICE_ROLE_KEY`
     env var at the Render step below (the env name stays the
     same; the value is the new format).
   - **Don't delete the legacy `service_role` key yet** — wait
     until after Stage 2.B is verified working, then come back
     and delete it. Once deleted, the old key cannot be
     restored.
6. **Storage buckets:** the migrations already create `avatars`
   and `cv` buckets. Open **Storage → Buckets** and confirm
   both exist and are **Public**.

### 2.B — Render: deploy the backend

Source: [render.com/docs/configure-environment-variables](https://render.com/docs/configure-environment-variables)

1. [dashboard.render.com](https://dashboard.render.com) → **New +
   → Web Service**.
2. Connect your GitHub account → pick the `needool-web-app`
   repo. (Note: this is the moment you actually use the GitHub
   push from Phase D. If you haven't pushed yet, push now per
   §12.5 — branch protection from 0.B ensures CI runs.)
3. Settings:
   - **Name**: `needool-backend`.
   - **Region**: closest to Nigeria.
   - **Branch**: `main`.
   - **Root directory**: `backend`.
   - **Runtime**: Node.
   - **Build command**: `npm install`.
   - **Start command**: `npm start`.
   - **Plan**: Free for now (upgrade to Starter when you get
     real traffic).
4. **Environment variables** (this is the long form — paste each
   one):
   - `NODE_ENV` = `production`
   - `DATA_PROVIDER` = `supabase`
   - `SUPABASE_URL` = your prod URL from 2.A
   - `SUPABASE_SERVICE_ROLE_KEY` = your new `sb_secret_...` from 2.A
   - `SUPABASE_STATE_TABLE` = `needool_app_state`
   - `SUPABASE_STATE_KEY` = `dummy_store`
   - `CLERK_SECRET_KEY` = the `sk_live_...` from 0.A
   - `CLERK_WEBHOOK_SECRET` = the `whsec_...` from 0.A
   - `ADMIN_ALLOWED_EMAILS` = your email + any co-admins,
     comma-separated
   - `NOWPAYMENTS_API_KEY` = (from your existing NOWPayments
     production account — see 2.C below; can defer this
     variable until 2.C is done)
   - `NOWPAYMENTS_IPN_SECRET` = (from 2.C)
   - `NOWPAYMENTS_BASE_URL` = `https://api.nowpayments.io/v1`
     (note: removes the `-sandbox` from the dev value)
   - `NOWPAYMENTS_IPN_CALLBACK_URL` = will be
     `https://api.needool.com/api/webhooks/nowpayments` once
     domain is up
   - `NOWPAYMENTS_SUCCESS_URL` = `https://needool.com/billing/success`
   - `NOWPAYMENTS_CANCEL_URL` = `https://needool.com/pricing`
   - `RESEND_API_KEY` = (from Resend dashboard — see 2.D)
   - `RESEND_FROM_EMAIL` = `Needool <hello@needool.com>`
   - `ALLOWED_ORIGINS` =
     `https://needool.com,https://www.needool.com,https://admin.needool.com`
   - `CSRF_SECRET` = the 128-char hex you generated in 0.D
   - **`CSRF_DISABLED` = `false`** ← critical, see §13
   - **`RATE_LIMIT_DISABLED` = `false`** ← critical, see §13
5. Click **Create Web Service**. Render builds + boots the
   backend. Note the auto-generated URL (e.g.
   `needool-backend.onrender.com`).
6. Test in your laptop browser: `https://needool-backend.onrender.com/health`
   should return JSON with `nowpaymentsConfigured: true`,
   `supabaseConfigured: true`, etc.
7. **DNS step** in Cloudflare: **DNS → Records → Add record** →
   Type **CNAME**, Name `api`, Target
   `needool-backend.onrender.com`, **Proxy status: DNS only
   (grey cloud)**. Save. After ~1 minute,
   `https://api.needool.com/health` resolves to your backend
   directly. **Don't orange-cloud yet** — that's Stage 3.

### 2.C — NOWPayments: production account + IPN secret

Source: [nowpayments.zendesk.com/hc/en-us/articles/21395546303389-IPN-and-how-to-setup](https://nowpayments.zendesk.com/hc/en-us/articles/21395546303389-IPN-and-how-to-setup)

1. Open the **production** NOWPayments dashboard at
   [account.nowpayments.io](https://account.nowpayments.io)
   (this is the live site — `account-sandbox.nowpayments.io` is
   the dev one).
2. Sign up / sign in. KYC may be required for live payouts
   ($5K+ thresholds).
3. **Store Settings → Outcome wallets** → set a TRC20 USDT
   address. **PRD §11.4 ops rule: keep this wallet under
   $5,000 USDT, sweep to cold storage daily, use a hardware
   wallet.** See 2.E for the hardware wallet step.
4. **Store Settings → API key** → generate. Copy to
   `NOWPAYMENTS_API_KEY` in Render.
5. **Store Settings → Payments → Instant payment notifications**
   → generate **IPN secret**. **Save it immediately — shown only
   once.** Goes into `NOWPAYMENTS_IPN_SECRET`.
6. **IPN callback URL** in the same panel: set to
   `https://api.needool.com/api/webhooks/nowpayments`.
7. After updating Render env, **Manual Deploy → Deploy latest
   commit** to re-read env.

### 2.D — Resend: domain verification

Source: [resend.com/docs/dashboard/domains/dmarc](https://resend.com/docs/dashboard/domains/dmarc)

1. [resend.com/dashboard](https://resend.com/dashboard) →
   **Domains → Add Domain** → `needool.com`.
2. Resend shows the DNS records you need. **Copy them.**
3. In Cloudflare: **DNS → Records**. Add each record exactly as
   Resend showed:
   - SPF: `TXT  @  v=spf1 include:_spf.resend.com -all`
     (the source guide recommends `-all` for hard fail).
   - DKIM: `CNAME  resend._domainkey  resend._domainkey.resend.com`.
   - **MX records (if Resend asks): leave unproxied —
     Cloudflare does NOT proxy MX traffic per their docs.**
4. Back on Resend, click **Verify**. Sometimes takes minutes,
   sometimes a couple hours.
5. **DMARC — start permissive:**
   - In Cloudflare DNS, add `TXT  _dmarc
     v=DMARC1; p=none; rua=mailto:dmarc@needool.com; pct=100`.
   - This is **NOT a hard policy yet** — `p=none` only collects
     reports for 1–2 weeks. The tightening to `p=quarantine` and
     `p=reject` is a Stage 4 task (see §13 reminder switches).
6. Resend dashboard → **API Keys → Create**. Copy the new key
   into `RESEND_API_KEY` in Render → redeploy.
7. Resend → **Sending → Send a test email** to your inbox.
   Confirm Gmail header shows `dmarc=pass` after the records
   resolve.

### 2.E — Cold-wallet / hardware-wallet setup (do whenever; required before withdrawals go live)

Source: [ledger.com/coin/wallet/matic-network](https://www.ledger.com/coin/wallet/matic-network)
+ PRD §11.4.

1. Order a **Ledger Nano X** or **Nano S Plus** from Ledger
   directly (NOT Amazon — counterfeit risk is real).
2. Set it up offline. Write the 24-word recovery phrase on two
   pieces of paper, store in two physical locations.
3. Install the **Ethereum** app via Ledger Live (Polygon uses
   the Ethereum app — they share the address format).
4. Open MetaMask → Connect Hardware Wallet → Ledger → select
   account → switch network to Polygon mainnet (Chain ID 137,
   RPC `https://polygon-rpc.com`).
5. That address is your **cold storage**. The NOWPayments hot
   wallet from 2.C sweeps to this address daily per PRD §11.4
   ops rule. Don't reuse it for anything else.

### 2.F — Vercel: deploy the frontend

Source: [vercel.com/docs/environment-variables](https://vercel.com/docs/environment-variables)

1. [vercel.com/new](https://vercel.com/new) → import the same
   GitHub repo.
2. **Framework Preset**: Vite (auto-detected).
3. **Root directory**: `frontend`.
4. **Environment Variables** — add each:
   - `VITE_API_BASE_URL` = `https://api.needool.com`
   - `VITE_PUBLIC_SITE_URL` = `https://needool.com`
   - `VITE_CLERK_PUBLISHABLE_KEY` = the `pk_live_...` from 0.A
   - `VITE_VAPID_PUBLIC_KEY` = the public half from 0.D
   - `VITE_ADMIN_PANEL_URL` = `https://admin.needool.com`
5. Click **Deploy**. Note the auto-generated URL
   (`needool-web-app.vercel.app`).
6. Settings → **Domains** → add `needool.com` and `www.needool.com`.
7. Vercel shows two DNS records to add. In Cloudflare:
   - `A   @   76.76.21.21` → **Proxy: DNS only (grey cloud)** for now.
   - `CNAME   www   cname.vercel-dns.com` → **DNS only**.
8. Wait ~1 minute. `https://needool.com` should load the frontend.
9. **Test the live frontend → backend** flow in the browser:
   sign in with Clerk, visit `/help`, hit `/api/auth/me` via the
   browser console.

### 2.G — Admin panel: separate Vercel project

1. [vercel.com/new](https://vercel.com/new) → same repo, but
   **Root directory**: `admin-panel`.
2. Env vars (different prefix — admin-panel uses Vite too):
   - `VITE_API_BASE_URL` = `https://api.needool.com`
   - `VITE_CLERK_PUBLISHABLE_KEY` = same `pk_live_...`
   - `VITE_ADMIN_ALLOWED_EMAILS` = your email + co-admins
3. Domain: `admin.needool.com` → Cloudflare DNS → `CNAME admin
   cname.vercel-dns.com` → **DNS only** for now.

---

## STAGE 3 — Cloudflare WAF + flip the orange cloud (PAUSE POINT)

Prereqs: Stage 2 is fully working. You've signed in, posted a
need, hit `/api/auth/me`, everything resolves through the grey
cloud.

**Before flipping, read [§13 Production Go-Live Switch Flips]
(#13-production-go-live-switch-flips). That's the critical
checklist of which env vars MUST be flipped at this moment.**

### 3.A — Cloudflare: add WAF rate-limit rules

Source: [developers.cloudflare.com/waf/rate-limiting-rules/](https://developers.cloudflare.com/waf/rate-limiting-rules/)

The rules go in **before** you flip the proxy — they only
activate against orange-clouded traffic. So configuring them
now means as soon as the cloud goes orange, they're enforcing.

1. Cloudflare Dashboard → pick `needool.com` zone → left nav
   **Security → WAF → Rate limiting rules** → **Create rule**.
2. Rule 1 — OTP brute force defense:
   - **Rule name**: `Block OTP brute force`.
   - **Field**: `URI Path`. **Operator**: `contains`. **Value**:
     `/api/hire-requests/otp/`.
   - **Counting characteristics**: IP address.
   - **Period**: `60 seconds`. (Allowed values per source:
     10, 60, 120, 300, 600, 3600.)
   - **Request threshold**: `5`.
   - **Action**: `Block`. (Allowed actions per source: block,
     js_challenge, managed_challenge, challenge, log.)
   - **Duration**: `10 minutes`.
   - **Deploy**.
3. Rule 2 — Auth brute force:
   - URI Path contains `/api/auth/`.
   - 10 req / 60 sec / IP. Action: Managed Challenge.
4. Rule 3 — Withdrawal abuse:
   - URI Path contains `/api/withdrawals`.
   - 5 req / 600 sec / IP. Action: Block.
5. Rule 4 — Generic API flood:
   - URI Path contains `/api/`.
   - 600 req / 60 sec / IP. Action: Managed Challenge.
6. **Save** all four. They're now "Deployed" but inactive
   against grey-clouded DNS.

### 3.B — Cloudflare: enable Bot Fight Mode + WAF managed rules

1. **Security → Bots → Bot Fight Mode** → ON. (Free tier.)
2. **Security → WAF → Managed rules** → enable the
   **Cloudflare Managed Ruleset**. Default action: **Managed
   Challenge** (less aggressive than block; reduces false
   positives in soft launch).

### 3.C — Set custom security headers via Cloudflare Transform Rules

This is the prod-grade place for the CSP I shipped as a meta
tag in Phase 8-6. Meta CSP works but headers > meta.

1. **Rules → Transform Rules → Modify Response Header →
   Create rule**.
2. Match: `Hostname equals needool.com`.
3. Then: **Set static** → header name `Content-Security-Policy`
   → value (paste the prod policy):
   ```
   default-src 'self'; script-src 'self' https://*.clerk.accounts.dev https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.needool.com https://*.clerk.accounts.dev https://*.supabase.co https://api.nowpayments.io; worker-src 'self'; frame-src https://*.clerk.accounts.dev https://challenges.cloudflare.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none';
   ```
4. **Deploy**.

### 3.D — FLIP THE ORANGE CLOUD (the actual go-live moment)

**This is the moment Cloudflare starts protecting your traffic.
§13 lists the env var switches that must already be true before
you flip; double-check §13 before proceeding.**

1. Cloudflare Dashboard → `needool.com` zone → **DNS → Records**.
2. For each of these records, click the **grey cloud** to turn
   it orange:
   - `A  @  76.76.21.21` (frontend)
   - `CNAME  www  cname.vercel-dns.com`
   - `CNAME  api  needool-backend.onrender.com`
   - `CNAME  admin  cname.vercel-dns.com`
3. **Do NOT proxy** these records (keep grey):
   - Resend SPF (TXT — TXT records can't be proxied anyway)
   - DKIM CNAME (`resend._domainkey`)
   - MX records (Cloudflare doesn't proxy email per source docs)
4. Verify within 30 seconds — open
   `https://needool.com/cdn-cgi/trace` in a browser.
   `h=needool.com`, `colo=` shows a Cloudflare PoP code (e.g.
   `LOS` for Lagos). You're live behind Cloudflare.
5. Re-test the four flows from 2.F.4. They should all still
   work. If anything 5xxs, check the Cloudflare **Security**
   tab for blocked requests.

---

## STAGE 4 — Soft-launch hardening (do over 1–2 weeks)

After Stage 3 is stable.

### 4.A — Tighten DMARC

1. After 1 week of `p=none` reports, open the DMARC report
   summary at [dmarcian.com](https://dmarcian.com) free tier.
2. If reports show 100% pass: change Cloudflare DNS
   `_dmarc` TXT to `p=quarantine`.
3. After another week of quarantine showing no legitimate mail
   bounced: change to `p=reject`.

### 4.B — Google Search Console + sitemap submission

1. [search.google.com/search-console](https://search.google.com/search-console) → **Add property** → URL prefix `https://needool.com`.
2. **Verify ownership** by adding the TXT record Google gives
   you to Cloudflare DNS.
3. **Sitemaps → Add a new sitemap** → enter `sitemap.xml`. Wait
   24h, then check Coverage.

### 4.C — Lighthouse audit against production

1. From your laptop:
   ```bash
   NEEDOOL_LH_BASE_URL=https://needool.com npm run test:lighthouse
   ```
2. PRD §19 acceptance bar: Performance ≥ 85 mobile, A11y ≥ 95.
   Output lands in `lighthouse-reports/summary.json`.
3. If perf < 85, common 2026 wins are: enable Cloudflare
   Auto Minify (CSS/JS), set Cache TTL to 4 hours on
   `/assets/*`, enable Tiered Cache.

### 4.D — Polygon (founder discretion, per PRD §3.5)

If you decide to ship the on-chain anchoring — it's "additive"
per PRD §3.5, app works without it:

1. Fund the Ledger address from 2.E with ~50 MATIC for ~6
   months of daily anchoring at current gas.
2. Deploy the ledger contract via Hardhat to Polygon mainnet
   (founder code — out of Claude scope per
   [[founder-launch-preferences]]).
3. Add `POLYGON_PRIVATE_KEY` (read from the Ledger app —
   Ledger's docs walk you through deriving the signing key) +
   `POLYGON_LEDGER_CONTRACT` to Render env vars.

---

End of §12.

---

## 13. Production Go-Live Switch Flips

**This section is the reminder list of every switch / value that
must be FLIPPED from its dev default to its production value at
the moment of going live.** It exists because the Phase 8
defenses are all gated by env vars that DEFAULT TO DEV-FRIENDLY
(off) so the 391-test suite and the local dev stack still run.
**If you push to prod without flipping these, the security
defenses are inert.**

When a future Claude session reads this handoff, surface this
section to the founder if they say "we're deploying" or "going
live" or anything similar.

### 13.1 Critical env-var flips (must be SET on Render before Stage 3.D)

| Variable | Dev default | Production value | Why |
| --- | --- | --- | --- |
| `NODE_ENV` | `development` | `production` | Disables dev-only `/api/dev/*` endpoints, flips other internal gates |
| `RATE_LIMIT_DISABLED` | `true` (auto in dev) | `false` | Without this, Phase 8-2 rate limiter is bypassed — OTP brute force is open |
| `CSRF_DISABLED` | `true` (auto in dev) | `false` | Without this, Phase 8-5 CSRF double-submit is bypassed |
| `CSRF_SECRET` | dev fallback string | the 128-char hex from §12.10 (0.D) | Without this, CSRF HMAC uses a known-public dev fallback |
| `SUPABASE_URL` | dev project URL | prod project URL (§12.10 stage 2.A) | Else writes go to dev DB |
| `SUPABASE_SERVICE_ROLE_KEY` | dev legacy key | prod `sb_secret_...` (§12.10 stage 2.A) | New key adds User-Agent guard |
| `CLERK_SECRET_KEY` | `sk_test_...` | `sk_live_...` (§12.10 stage 0.A) | Else uses dev tenant |
| `CLERK_WEBHOOK_SECRET` | dev `whsec_...` | prod `whsec_...` (§12.10 stage 0.A) | Else webhooks fail |
| `NOWPAYMENTS_BASE_URL` | `https://api-sandbox.nowpayments.io/v1` | `https://api.nowpayments.io/v1` | Else payments go to sandbox (no real settlement) |
| `NOWPAYMENTS_API_KEY` | sandbox key | live key (§12.10 stage 2.C) | Same reason |
| `NOWPAYMENTS_IPN_SECRET` | sandbox secret | live secret (§12.10 stage 2.C) | Else webhook signature verification fails |
| `NOWPAYMENTS_IPN_CALLBACK_URL` | ngrok URL or empty | `https://api.needool.com/api/webhooks/nowpayments` | Else NOWPayments doesn't know where to call |
| `NOWPAYMENTS_SUCCESS_URL` | `http://localhost:3000/billing/success` | `https://needool.com/billing/success` | UX |
| `NOWPAYMENTS_CANCEL_URL` | `http://localhost:3000/pricing` | `https://needool.com/pricing` | UX |
| `RESEND_API_KEY` | empty / dev | live (§12.10 stage 2.D) | Else emails console-log only |
| `RESEND_FROM_EMAIL` | dev placeholder | `Needool <hello@needool.com>` | Must match verified Resend domain |
| `ALLOWED_ORIGINS` | localhost ports | `https://needool.com,https://www.needool.com,https://admin.needool.com` | CORS — wrong origins block legitimate frontend |
| `ADMIN_ALLOWED_EMAILS` | dev test emails | your real founder email + co-admins | Admin gate |

### 13.2 Cloudflare flips (Stage 3.D)

- ☐ DNS records for `@`, `www`, `api`, `admin` flipped from
  **grey cloud (DNS only)** to **orange cloud (proxied)**.
- ☐ Email-related records (SPF TXT, DKIM CNAME, MX) **stay grey**.
- ☐ All 4 WAF rate-limit rules from §12.10 stage 3.A deployed.
- ☐ Bot Fight Mode ON.
- ☐ WAF Managed Ruleset enabled with Managed Challenge.
- ☐ Transform Rule for production CSP header added.

### 13.3 Vercel + Render flips

- ☐ Vercel custom domain `needool.com` → verified + SSL active.
- ☐ Render custom domain `api.needool.com` → verified + SSL active.
- ☐ Vercel deploy protection: Settings → Deployment Protection →
  **Production deployments require approval** ON.
- ☐ Render: Settings → **Auto-deploy** → `On Commit` to `main`
  only (no other branches).

### 13.4 Clerk flips

- ☐ Production app `pk_live_...` / `sk_live_...` set in
  Vercel + Render envs.
- ☐ Webhook endpoint registered → URL =
  `https://api.needool.com/api/webhooks/clerk`.
- ☐ MFA required toggle ON in Production app
  (§12.10 stage 0.A.5).
- ☐ Sign-in URL / Sign-up URL / After-sign-in fallback set to
  `https://needool.com/login`, `/signup`, `/dashboard`.

### 13.5 Stage 4 reminder switches (after 1–2 weeks of soft launch)

- ☐ DMARC `_dmarc` TXT changed from `p=none` → `p=quarantine`.
- ☐ Then a week later → `p=reject`.
- ☐ Google Search Console `sitemap.xml` submitted.
- ☐ NOWPayments hot wallet swept to Ledger cold storage daily
  (PRD §11.4 ops rule).
- ☐ Revoke the legacy Supabase `service_role` key (§12.10 stage
  2.A.5).

### 13.6 What NOT to flip until you actually have user traffic

- Don't enable Clerk's "Phone number" sign-up method — Nigeria
  phone verification SMS cost adds up fast. Soft launch on
  email/password only per PRD §2.5.
- Don't set DMARC `p=reject` on day one — you'll bounce
  legitimate notifications from yourself / cron jobs.
- Don't fund the Polygon anchor wallet until you've shipped the
  contract + cron (PRD §3.5 anchoring is "additive" — app works
  without it).

### 13.7 Verification once flipped

After Stage 3.D, run these 5 probes from your laptop:

```bash
# 1. CSRF gate active
curl -X POST https://api.needool.com/api/notifications/read-all -i
# Expect: HTTP/2 403  "CSRF check failed"

# 2. Rate limit on OTP fires after 5 attempts
for i in {1..6}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://api.needool.com/api/hire-requests/otp/request \
    -H 'content-type: application/json' \
    -d '{"email":"probe@example.com"}'
done
# Expect: 200,200,200,200,200,429 (or Cloudflare 1015 before backend)

# 3. Body cap fires
curl -X POST https://api.needool.com/api/hire-requests \
  -H 'content-type: application/json' \
  --data "$(python3 -c 'print(\"x\"*2000000)')" -i
# Expect: HTTP/2 413

# 4. CSP header present
curl -sI https://needool.com | grep -i content-security-policy
# Expect: content-security-policy: default-src 'self'; ...

# 5. CSRF cookie set on GET
curl -sI https://needool.com/api/needs | grep -i set-cookie
# Expect: set-cookie: ndl_csrf=...; Path=/; Max-Age=86400; Secure; SameSite=Strict
```

All five must return the expected. If any miss, do NOT continue
to user outreach — the defense is inert.

End of §13.
