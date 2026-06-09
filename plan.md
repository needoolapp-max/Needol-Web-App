# Plan — Phase 0 prep + Phase 2 (Hire Requests → Job Openings → Verified Hires → Reviews Trigger A)

This file is the live spec for the next implementation session. `handoff.md`
covers what's already shipped (Clerk auth, NOWPayments subscriptions, Phase 1
moderation, Phase 1.5 events). Phases 3 + 4 are sketched at the bottom for
future-you's planning.

## Context

Phase 1 + 1.5 are verified. The admin panel can moderate Users, Needs,
Opportunities, and Events. The next chunk of value is the **paid hiring
service** that PRD §8 positions as Needool's primary revenue stream —
employers pay $500+ per role, Needool curates the opening, screens
applicants, and marks Verified Hires.

Decisions confirmed:
- **Include Trigger A reviews** (employer side via one-time magic-token URL;
  applicant side via Clerk session). Verified Hires would sit idle otherwise.
- **Skip OTP** on the public hire-request form for now — defer to Phase 4
  alongside notifications.
- **Rewire the public `/jobs` feed** to the new `job_openings` table; the
  static seed-array endpoint disappears.

Playwright remains the closing gate: 12 required checks at the bottom; phase
is not closed until all 12 pass with zero console errors (theme-toggle
hydration warning excepted) and only expected 4xx responses (403 / 409 / 429
on the test cases that should fire them).

## Cross-cutting principles (carried from earlier phases)

- One migration file per phase: `context/deployment/phase-N-*.sql`. Enable
  RLS + deny-all policy on every new table.
- Pure logic in `lib/<domain>.mjs`, IO in `lib/<domain>-store.mjs` —
  mirrors `subscriptions.mjs` + `subscription-store.mjs`.
- Reuse `apiFetch` (frontend) and the `supabase.mjs` wrappers (backend).
- Effective status is lazy-computed; never stored as a denormalized flag.
- Every phase ends with a Playwright run that drives the new flows
  end-to-end.

---

## Phase 0 — Prep refactors (must land first)

These changes are prerequisites for Phase 2's hire-quote payment flow. They
touch the subscription path too, so they ship before any hire-request code.

- `backend/lib/payments-store.mjs` (new) — move `recordPayment`,
  `getPaymentById` out of `subscription-store.mjs`. The subscription store
  keeps activation logic; payments store is the shared idempotency layer.
- `backend/lib/nowpayments.mjs` — add a prefix-dispatch helper:

  ```js
  // exports
  buildOrderId(prefix, parts)            // e.g. buildOrderId('u', [userId, planCode]) → 'u.user_xyz.individual_monthly.1700000000'
  parseOrderId(orderId)                  // returns { prefix, parts: [...], timestamp }  or null
  registerOrderHandler(prefix, handler)  // handler signature: async (payload, parts) => { applied, reason? }
  resolveOrderHandler(prefix)            // returns the registered handler or null
  ```

- `backend/server.mjs` — refactor `processNowpaymentsPayload` to:
  1. Read `payment_id`, parse `order_id` → prefix + parts.
  2. Insert/upsert the payment row via `paymentsStore.recordPayment`
     regardless of prefix (idempotency).
  3. Look up the registered handler for the prefix; if absent, return
     `{ applied: false, reason: 'unknown_prefix' }`.
  4. If status is terminal (`finished` or `partially_paid`), call the
     handler. Idempotency check gates the handler call, not the payment
     insert.
- Register the existing subscription handler under prefix `u` at startup.
  Phase 2 registers the hire-quote handler under prefix `h`.

No new tables; no UI changes. Backend smoke: existing subscribe flow still
works (`POST /api/dev/simulate-webhook` with a `u.<userId>.<plan>.<ts>`
order_id activates the subscription).

---

## Phase 2 — Schema migration

File: `context/deployment/phase-2-jobs-reviews-a.sql`. Run in the Supabase
SQL editor before code starts. Enable RLS + deny-all policy on every new
table.

### Tables

- **`hire_requests`** — public-facing employer requests.
  - `id uuid pk default gen_random_uuid()`.
  - Employer identity: `employer_name`, `employer_website`, `contact_name`,
    `contact_email` (the auth hook for employer reviews), `contact_phone`,
    `contact_whatsapp`.
  - Role spec: `role_title text not null`, `num_hires int default 1`,
    `account_type_pref text check (in ('Individual','Business','Both'))`,
    `employment_type text check (in ('remote','onsite','hybrid'))`,
    `location text`, `job_description text`, `qualifications text`,
    `salary_usd numeric`, `other_benefits text`, `notes text`.
  - Lifecycle: `status text default 'new' check (in
    ('new','quoted','paid','promoted','cancelled'))`,
    `quote_amount_usd numeric`, `quote_payment_id text`,
    `quote_order_id text`, `quote_sent_at`, `quote_expires_at` (14 days
    per PRD §8.2), `paid_at`, `promoted_job_opening_id uuid`,
    `cancelled_at`, `cancel_reason text`.
  - `created_at`, `updated_at`.

- **`job_openings`** — published openings (and drafts).
  - `id uuid pk`, `hire_request_id uuid references hire_requests(id) on
    delete set null` (nullable: admins can post openings directly too),
    `external_job_opening_id text` (admin-entered offline payment ref).
  - `title text not null`, `eligible_account_type text check (in
    ('Individual','Business','Both'))`, `eligible_locations jsonb default
    '[]'` (array of "City, State, Country" strings; empty = any),
    `eligible_nationalities jsonb default '[]'`, `employment_type text`
    (`Remote|OnSite|Hybrid`), `description text`,
    `application_instructions text`.
  - Lifecycle: `status text default 'draft' check (in
    ('draft','open','closed'))`, `pinned bool default false`,
    `published_at`, `closed_at`, `created_at`, `updated_at`.

- **`job_opening_questions`** — up to 10 per opening (PRD §8.3).
  - `id uuid pk`, `job_opening_id uuid references job_openings(id) on
    delete cascade`, `position int not null`, `prompt text not null`,
    `description text`.
  - Unique `(job_opening_id, position)`.

- **`job_applications`** — user submits, admin scores.
  - `id uuid pk`, `job_opening_id uuid references job_openings(id) on
    delete cascade`, `applicant_id text references users(id) on delete
    cascade`.
  - `snapshot jsonb` (captured profile at apply-time), `answers jsonb`
    (array of `{question_id, prompt, answer}`).
  - `score int check (score between 0 and 100)`, `notes text`,
    `status text default 'submitted' check (in
    ('submitted','under_review','shortlisted','hired','rejected'))`,
    `hired_at timestamptz`, `created_at`, `updated_at`.
  - Unique `(job_opening_id, applicant_id)` — one app per user per opening.

- **`verified_hires`** — created when admin marks an application Hired
  (review trigger A).
  - `id uuid pk`, `job_application_id uuid references job_applications(id)
    on delete cascade`, `job_opening_id uuid references job_openings(id)`,
    `applicant_id text references users(id)`, `employer_email text not
    null`, `employer_name text`, `employer_review_token text not null
    unique` (one-time URL token for employer-side review).
  - Time gates: `reviewer_unlock_at timestamptz default now() + interval
    '7 days'` (PRD §9.2), `review_window_end_at timestamptz default now() +
    interval '180 days'`, `created_at`.

- **`reviews`** — both Trigger A directions.
  - `id uuid pk`, `trigger_type text check (in
    ('verified_hire','member'))` (Phase 2 writes only `verified_hire`),
    `verified_hire_id uuid references verified_hires(id) on delete cascade`.
  - `reviewer_id text references users(id)` (NULL for employer reviews;
    they authenticate via `employer_review_token`).
  - `reviewer_kind text check (in ('applicant','employer','member'))`.
  - `target_user_id text references users(id)` (the applicant when
    employer reviews; NULL when applicant reviews the employer since the
    employer has no user row), `target_employer_name text` (set on
    applicant→employer direction).
  - `rating int check (rating between 1 and 5) not null`, `comment text`,
    `evidence_url text` (required for ratings 1–2 per PRD §9.5).
  - `status text default 'live' check (in ('held','live','rejected'))`,
    `hold_reason text`.
  - `created_at`, `updated_at`, `locked_at timestamptz default now() +
    interval '14 days'` (PRD §9.2: editable 14 days then locked).
  - Unique `(verified_hire_id, reviewer_kind)` — one review per direction
    per Verified Hire.

### Indexes

- `hire_requests (status, created_at desc)`.
- `job_openings (status, created_at desc)`, `(hire_request_id)`.
- `job_applications (job_opening_id, status, score desc)`,
  `(applicant_id, created_at desc)`.
- `verified_hires (applicant_id, created_at desc)`,
  `(employer_review_token)` unique.
- `reviews (target_user_id, status, created_at desc)`,
  `(verified_hire_id)`.

---

## Phase 2 — Backend libs

Mirror the Phase 1 split: pure logic in `lib/<domain>.mjs`, IO in
`lib/<domain>-store.mjs`. Build sequence:

1. `backend/lib/hire-requests.mjs` — pure: `validateHireRequestInput(body)`,
   `quoteExpiryDate(now = new Date())` (14 days), allowed status
   transitions.
2. `backend/lib/hire-requests-store.mjs` — `createHireRequest`, `getById`,
   `listByStatus({status, limit})`, `setQuote({id, amount, paymentId,
   orderId})`, `markPaid({id, paidAt})`, `promote({id, jobOpeningId})`,
   `cancel({id, reason})`.
3. `backend/lib/job-openings.mjs` — pure: `isUserEligible({user,
   opening})` (checks `status='active'`, accountType matches, location
   matches if list non-empty, nationality matches if list non-empty,
   `profile_complete=true`). PRD §8.4.
4. `backend/lib/job-openings-store.mjs` — `createJobOpening`,
   `setQuestions(id, questionsArray)`, `getById`, `listPublic`,
   `listAdmin`, `publish`, `close`.
5. `backend/lib/applications-store.mjs` — `apply({jobOpeningId, applicant,
   answers})`, `listForOpening(id)`, `listForApplicant(id)`,
   `setScore(id, score, notes)`, `setStatus(id, status)`,
   `markHired(applicationId, hiredAt)`.
6. `backend/lib/verified-hires-store.mjs` — `create({application,
   employerEmail, employerName})` (generates a URL-safe random
   `employer_review_token`), `getByToken(token)`, `getById(id)`,
   `listForUser(userId)`.
7. `backend/lib/reviews.mjs` — pure: `canReviewNow(verifiedHire, now)`
   (returns `{ allowed, reason }`), `isEditable(review, now)`,
   `requiresEvidence(rating)` (true if 1 or 2 per PRD §9.5).
8. `backend/lib/reviews-store.mjs` — `submitApplicantReview({verifiedHire,
   applicantUserId, rating, comment, evidenceUrl})`,
   `submitEmployerReview({verifiedHire, rating, comment, evidenceUrl})`,
   `listForTargetUser(userId)`, `aggregateRating(userId)`.

Register the hire-quote prefix handler in `nowpayments.mjs`:

```js
// Server registers this at startup
registerOrderHandler('h', async (payload, parts) => {
  // parts = [hireRequestId, timestamp]
  const hireRequestId = parts[0];
  const hireRequest = await hireRequestsStore.getById(hireRequestId);
  if (!hireRequest) return { applied: false, reason: 'unknown_hire_request' };
  if (hireRequest.status === 'paid' || hireRequest.status === 'promoted') {
    return { applied: false, reason: 'idempotent_replay' };
  }
  await hireRequestsStore.markPaid({ id: hireRequestId, paidAt: new Date().toISOString() });
  const draft = await jobOpeningsStore.createJobOpening({
    hire_request_id: hireRequestId,
    title: hireRequest.role_title,
    eligible_account_type: hireRequest.account_type_pref,
    employment_type: hireRequest.employment_type,
    description: hireRequest.job_description,
    application_instructions: 'Tell us briefly why this role fits you.',
    status: 'draft',
  });
  await hireRequestsStore.promote({ id: hireRequestId, jobOpeningId: draft.id });
  return { applied: true };
});
```

---

## Phase 2 — Backend endpoints (`server.mjs`)

### Public hire-request flow
- `POST /api/hire-requests` — public. Validate body, insert as
  `status='new'`. (OTP deferred to Phase 4.)

### Admin hire-request inbox
- `GET /api/admin/hire-requests?status=` — admin-only list.
- `POST /api/admin/hire-requests/:id/quote` — admin-only.
  - Body: `{ amount, deliverables, dueDate }`.
  - Builds `orderId = buildOrderId('h', [hireRequestId])`.
  - Calls `nowpayments.createInvoice({ priceAmount: amount, orderId, … })`.
  - Saves `quote_payment_id`, `quote_order_id`, `quote_amount_usd`,
    `quote_sent_at`, `quote_expires_at = now + 14d`, status → `quoted`.
  - Returns `{ invoiceUrl, invoiceId, orderId }`.
- `POST /api/admin/hire-requests/:id/cancel` — sets `status='cancelled'`,
  `cancel_reason`, `cancelled_at`.

### Public + member jobs
- `GET /api/jobs` — public; returns `job_openings WHERE status='open'`
  with lite join to questions. **Replaces** today's static array.
- `GET /api/jobs/:id` — public; opening + questions.
- `POST /api/jobs/:id/apply` — Clerk-verified.
  - Loads user, opening + questions, validates eligibility
    (`isUserEligible`), throws 403 with specific reason if not.
  - Body: `{ answers: [{question_id, answer}, ...] }`. Validates every
    mandatory question answered.
  - Inserts application with `snapshot` = current user shape,
    `status='submitted'`.
  - Unique constraint catches duplicates → 409.
- `GET /api/me/applications` — Clerk; user sees their own.
- `GET /api/me/verified-hires` — Clerk; powers the review page.

### Admin job openings
- `GET /api/admin/job-openings?status=` — admin.
- `POST /api/admin/job-openings` — admin creates a non-hire-linked opening
  directly (skipping hire-request flow).
- `PATCH /api/admin/job-openings/:id` — admin updates fields (title,
  eligibility filters, description, application_instructions, questions).
- `POST /api/admin/job-openings/:id/publish` — admin publishes a draft;
  sets `status='open'`, `published_at`.
- `POST /api/admin/job-openings/:id/close` — admin closes.
- `GET /api/admin/job-openings/:id/applicants` — applicants with
  snapshot + score + status.
- `PATCH /api/admin/applications/:id` — admin scoring / status. Body:
  `{ action: 'score'|'shortlist'|'mark-hired'|'reject', score?, notes? }`.
  - On `mark-hired`: also creates `verified_hires` row (calls
    `verifiedHiresStore.create`). Returns the created
    `employer_review_token`.

### Reviews
- `POST /api/reviews` — Clerk. Body: `{ verifiedHireId,
  reviewerKind: 'applicant', rating, comment, evidenceUrl? }`.
  - Verify the verified_hire's `applicant_id === session.userId`.
  - `canReviewNow(verifiedHire, now)` must allow: past `reviewer_unlock_at`
    and before `review_window_end_at`.
  - Require evidence for ratings 1–2.
  - Insert with `target_user_id=NULL`,
    `target_employer_name=verifiedHire.employer_name`, `status='live'`
    (Phase 4 will gate 1–2 stars on admin pre-approval).
- `GET /api/reviews/token/:token` — public; returns a safe subset of the
  verified_hire (applicant_id, applicant snapshot, employer_name,
  unlock_at, window_end). Used by the employer review page.
- `POST /api/reviews/by-token` — public. Body: `{ token, rating, comment,
  evidenceUrl? }`.
  - Resolve verified_hire by token; reject if not found.
  - `canReviewNow`.
  - Require evidence for 1–2.
  - Insert with `reviewer_id=NULL, reviewer_kind='employer',
    target_user_id=verifiedHire.applicant_id`, `status='live'`.
- `GET /api/profiles/:userId/reviews` — public; returns
  `listForTargetUser(userId)` with aggregate rating. Surfaces on profile
  pages.

### Dev shortcut
- `POST /api/dev/expire-review-windows` — dev-only. Body:
  `{ verifiedHireId, mode: 'unlock'|'expire' }`. Mutates
  `reviewer_unlock_at` (unlock) or `review_window_end_at` (expire) to the
  past so Playwright can hit both code paths without time-travel.

---

## Phase 2 — Frontend

### New routes
- `frontend/src/routes/jobs.hire-request.tsx` — public form capturing all
  PRD §8.1 fields. POSTs to `/api/hire-requests`. Shows "Thank you, we'll
  email a quote" on success.
- `frontend/src/routes/jobs.tsx` → Outlet layout (mirrors the
  needs/opportunities pattern from Phase 1).
- `frontend/src/routes/jobs.index.tsx` — DB-backed feed listing published
  openings with title, employment_type, eligibility hints.
- `frontend/src/routes/jobs.$id.tsx` — opening detail + apply form.
  Renders questions; on submit, posts to `/api/jobs/:id/apply`. Disables
  apply button with inline reason if eligibility fails.
- `frontend/src/routes/dashboard.applications.tsx` — user's applications
  list in the existing Dashboard sidebar.
- `frontend/src/routes/reviews.$verifiedHireId.tsx` — applicant review
  form (uses Clerk). Linked from `/dashboard/applications` (Hired → "Leave
  a review").
- `frontend/src/routes/review-employer.$token.tsx` — employer review form
  (no Clerk). Loads `/api/reviews/token/:token` to populate the form,
  submits to `/api/reviews/by-token`.

### Profile page surface
- `frontend/src/routes/p.$username.tsx` — append a "Reviews" section that
  reads `/api/profiles/:userId/reviews` (resolve userId via username
  lookup; add `GET /api/users/by-username/:username` if not present —
  small backend addition).

---

## Phase 2 — Admin panel

Extend `admin-panel/src/main.jsx`. Replace placeholders for:

- **Hire Requests** tab — list `GET /api/admin/hire-requests`. Columns:
  Employer, Role, Status, Quote, Created. Row actions:
  - "Send quote" → prompt for amount → POSTs
    `/api/admin/hire-requests/:id/quote` → on success shows the
    `invoiceUrl` returned (admin emails it manually for now; Phase 4 wires
    Resend).
  - "Cancel" → POSTs cancel endpoint.
- **Job Openings** tab — list `GET /api/admin/job-openings`. Columns:
  Title, Status, Applicants count (lazy from `/applicants`), Created. Row
  actions:
  - "Edit" → opens an edit form (eligibility filters + questions).
  - "Publish" / "Close".
  - "Applicants" → side panel with score inputs + status select + "Mark
    Hired" button. On Mark Hired, surface the `employer_review_token` URL
    so the admin can copy + email manually.
- **Verified Hires** subview within Job Openings — recent verified hires
  with the magic-link URL for the employer review.

Reviews moderation tab stays as a placeholder until Phase 4 (Trigger B +
held 1–2 star queue).

---

## Phase 2 — Playwright verification (12 checks)

Driven against the live stack (`ngrok / backend / frontend / admin-panel`).

1. **Public hire-request submission**: navigate `/jobs/hire-request`, fill
   the form, submit. Assert row exists with `status='new'`. Confirm
   public confirmation page renders.
2. **Admin sees the hire request**: open admin panel as an allowlisted
   user (or hit `GET /api/admin/hire-requests` via direct API since the
   test user is non-allowlisted — same gate-confirmation pattern as Phase
   1 verification). Assert the new row.
3. **Admin sends quote**: POST `/api/admin/hire-requests/:id/quote` with
   `{ amount: 500 }`. Assert response includes `invoiceUrl`; status flips
   to `quoted`; `quote_order_id` matches `h.<id>.<ts>`.
4. **Webhook auto-promote**: POST `/api/dev/simulate-webhook` with the
   hire-quote `order_id`. Assert status flips to `promoted`, a
   `job_openings` row exists in `draft`, `promoted_job_opening_id`
   populated.
5. **Admin publishes opening with questions**: PATCH the draft to add 2
   custom questions + eligibility rule (e.g. `eligible_account_type =
   'Individual'`). Then `POST /publish`. Assert `status='open'`,
   `published_at` set.
6. **Public `/jobs` feed shows the opening**: navigate `/jobs` as
   visitor. Confirm the opening appears.
7. **Eligibility block**: hit `POST /api/jobs/:id/apply` as a Business
   user (or inactive) — assert 403 with the specific reason. Verify the
   detail page shows the reason inline.
8. **Apply succeeds for eligible Individual + active**: post answers to
   both questions. Assert application row created with snapshot + answers
   + `status='submitted'`.
9. **Admin scores + marks Hired**: PATCH application to score 85 +
   shortlist, then PATCH to `mark-hired`. Assert `verified_hires` row
   created with `employer_review_token`, `reviewer_unlock_at` 7 days
   ahead.
10. **Reviews blocked pre-unlock**: applicant POSTs a review with the
    verified_hire ID immediately → 403 "Review window not yet open".
11. **Dev unlock + applicant review**: POST `/api/dev/expire-review-windows`
    with mode `unlock`. Applicant POSTs review (4★, no evidence). Assert
    review row created.
12. **Employer review via token**: POST `/api/reviews/by-token` with the
    token, rating 5, no evidence. Assert second review row created with
    `target_user_id = applicant.userId`. Navigate to the applicant's
    profile page; assert the review section shows the new 5★ review with
    aggregate rating.

Failure tolerance: pre-existing theme-toggle SSR hydration mismatch is
the only known noisy warning. Console errors must otherwise be zero.
Network 4xx allowed only for test cases (403 / 409) that should fire.

---

## Phase 2 — Files to create / modify

| Layer | Files |
| --- | --- |
| Schema | `context/deployment/phase-2-jobs-reviews-a.sql` (new) |
| Backend libs (new) | `payments-store.mjs`, `hire-requests.mjs`, `hire-requests-store.mjs`, `job-openings.mjs`, `job-openings-store.mjs`, `applications-store.mjs`, `verified-hires-store.mjs`, `reviews.mjs`, `reviews-store.mjs` |
| Backend libs (refactor) | `nowpayments.mjs` (prefix dispatch), `subscription-store.mjs` (remove payment helpers; keeps activation only) |
| Backend routes | `server.mjs` (rewrites `processNowpaymentsPayload` + adds ~18 new endpoints) |
| Frontend routes (new) | `routes/jobs.hire-request.tsx`, `routes/jobs.index.tsx`, `routes/jobs.$id.tsx`, `routes/dashboard.applications.tsx`, `routes/reviews.$verifiedHireId.tsx`, `routes/review-employer.$token.tsx` |
| Frontend routes (refactor) | `routes/jobs.tsx` → Outlet layout (mirrors needs/opportunities pattern) |
| Frontend components | `components/jobs/JobApplyForm.tsx`, `components/jobs/JobOpeningCard.tsx`, `components/reviews/ReviewForm.tsx`, `components/profile/ReviewsSection.tsx` |
| Admin panel | extend `admin-panel/src/main.jsx` with HireRequestsPage, JobOpeningsPage, ApplicantsPanel components; keep DataPage placeholders for Reviews, Withdrawals |

---

## Phase 2 — Cuts called out

- **No OTP** on the hire-request form (Phase 4 with notifications).
- **No automated quote email** — admin copies the invoice URL from the
  admin panel and emails it manually for now (Phase 4 wires Resend).
- **Trigger B reviews + anti-abuse + kill-switch** stay in Phase 4.
- **Audit log** wrapper added in Phase 4 (admin actions in Phase 2 are
  uninstrumented; known temporary gap).
- **Search / sort / pagination** on admin tables: list-of-100 with a
  simple status filter dropdown. Phase 3+ adds pagination if it becomes
  painful.

---

## Phase 2 — Verification environment

Same as Phase 1: ngrok tunnel at
`https://janitor-donut-slimness.ngrok-free.dev`, backend :4100, frontend
:3000, admin-panel :3200. Migration runs in Supabase SQL editor before
code starts. Test accounts as before (`needool+clerk_test@example.com`
for the applicant flow, `elevatewebnmarketing@gmail.com` /
`needoolapp@gmail.com` for admin actions).

When the migration has applied and the code is in, the 12 Playwright
checks above gate phase closure. A failure on any single check pauses
work; root cause first, then re-run.

---

# Phase 3 — Withdrawals + Wallet + Referral commissions (sketch)

(To be re-planned at the start of that session.)

**New tables**: `referral_commissions`, `wallet_balances` (or compute as
a view), `withdrawals`.

**Backend additions**:
- Extend `processNowpaymentsPayload` to write a `referral_commissions`
  row when the paying user has `referred_by` set. Rate = 10% if referrer
  is currently active, 2% otherwise (PRD §11.2). On referrer activation
  later, retroactively bump prior commissions 2% → 10% (PRD §11.2).
- User `POST /api/withdrawals` (TRC20 address + min 20 USDT + TOTP
  stubbed in dev).
- Admin `GET /api/admin/withdrawals`, `PATCH /api/admin/withdrawals/:id`
  with `{action: 'approve'|'mark-paid', tx_hash?}`.

**Frontend**: referrals dashboard now shows real earned/balance,
withdrawal form, history.

**Admin panel**: real Withdrawals queue with approve + tx-hash paste flow.

**Playwright**: subscribe a referred user → simulate-webhook → referrer's
wallet balance increments → request withdrawal → admin approves + pastes
hash → user sees Completed.

---

# Phase 4 — Reviews Trigger B + Audit Log + Help CMS + Notifications (sketch)

(To be re-planned at the start of that session.)

**Reviews Trigger B**: extends Phase 2's `reviews` table to allow
`trigger='member'`. Enforces all PRD §9.4 anti-abuse controls
(5-per-rolling-30 limit, no-shared-referrer-within-1-hop,
≤10-Trigger-B-reviews-in-first-60-days, 1–2★ held for admin pre-approval,
target can request review). Kill-switch via a new `feature_flags` table
(`trigger_b_enabled` boolean, toggleable by Owner from admin panel).

**Audit log**: `admin_audit_log` table + `withAdminAudit(action, fn)`
wrapper applied retroactively to all admin handlers from Phases 1–3.

**Help CMS**: `help_articles` table; admin markdown editor; public
`/help/[slug]` pages.

**Notifications**: write to `users.notifications jsonb` array for
in-app; trigger Resend email for important events (PRD §12 table). Use
existing Resend env vars.

**Playwright**: Trigger-B review flow with anti-abuse → audit log
captures every admin action → help article publish → renewal reminder
email fires at 3 days before expiry.
