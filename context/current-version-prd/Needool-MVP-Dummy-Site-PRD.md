# Needool MVP Dummy Site PRD

Version: Current local dummy implementation
Source baseline: `context/Needool MVP PRD v3 (1).docx`
Prepared: May 2026

## 1. Purpose

This PRD describes the runnable localhost version of Needool in this folder. It turns the larger Needool MVP v3.0 product specification into a dummy, API-key-free demo that can be used for product review, UI walkthroughs, and later integration with real services.

The dummy site must preserve the MVP's intent: a global skills directory and marketplace where people find providers, post needs and opportunities, browse events and jobs, subscribe, earn referral rewards, and interact with admin-moderated trust systems. In this version, all data is static or served by a local dummy backend.

## 2. Required Structure

The app is split into three top-level folders:

- `frontend`: public Needool web experience for visitors, members, and providers.
- `backend`: local dummy JSON API and placeholder integration surface.
- `admin-panel`: separate admin operations dashboard.

The `context` folder remains as product documentation and brand context.

## 3. Current Technology

The existing web app is a TypeScript React app using Vite, TanStack Router/Start, Tailwind CSS, shadcn-style components, Radix primitives, React Query, and lucide-react icons. The dummy backend uses Node's built-in HTTP server so it has no API-key or database requirement. The admin panel is a separate Vite React app.

## 4. Dummy Integration Policy

All third-party services are represented by placeholders:

- Google Maps: dummy city/state/country and approximate distance fields.
- Supabase Auth/Postgres/Storage: local mock users, providers, posts, and admin queues.
- NowPayments: dummy checkout records and subscription states.
- Resend/email: local notification samples.
- TOTP withdrawals: status-only mock queue.
- Polygon anchoring: dummy hash and transaction references.
- CV parsing: sample CV preview text only.

Real keys should later be added through environment variables and server-side integration files, not hardcoded into the UI.

## 5. MVP Surface Included In This Dummy Build

### Public Directory

Visitors can browse the home page, search providers, view active and inactive providers, inspect profile pages, and see active-first ranking. Contact details, links, and CVs are locked based on dummy auth state.

### Profiles

Profiles show account type, activity state, location, skills, services, hourly rate, work hours, remote status, followers, reviews, CV preview, contact CTA, and Needool disclaimer.

### Need Requests

The dummy MVP includes a Need Requests view with seeded posts, status badges, budgets, locations, categories, and moderation states. Real creation, comments, likes, links, rate limits, and approval workflows are represented as demo data.

### Opportunities

The dummy MVP includes a separate Opportunities view for grants, calls, scholarships, partnerships, and fellowships. Items show scope, deadline, approval state, and links as placeholder data.

### Events

The dummy MVP includes an Events view for admin-posted events only. Users can browse online and physical events with location, type, status, and dummy registration links.

### Job Openings And Hire Requests

The dummy MVP includes a Jobs view with active openings, eligibility summaries, applicant counts, and a hire-request CTA. The paid quote and NowPayments flow is represented as static statuses.

### Subscriptions And Billing

The dummy MVP includes subscription cards for Individual and Business accounts, trial messaging, renewal window copy, the 13-month stacking cap, and placeholder checkout copy.

### Referrals And Wallet

The dummy MVP includes a referral/wallet summary with lifetime earnings, current balance, referred users, withdrawal status, and dummy TRC20 payout references.

### Reviews And Trust

Profiles include Verified Hire and Member review tags. The MVP demo explains the Trigger A and Trigger B rules, evidence requirement, review moderation, and feature flag approach in static UI and admin queues.

### Help And Guide

The dummy MVP includes a Help view with FAQ-style articles for signups, posting, subscriptions, referrals, reviews, and safety.

### Admin Panel

The separate `admin-panel` app includes dummy modules for dashboard KPIs, users, post approvals, hire requests, job openings, event management, review moderation, withdrawals, help CMS, feature flags, and audit log.

## 6. Backend Contract For Later Integration

The local backend exposes dummy JSON endpoints:

- `GET /health`
- `GET /api/providers`
- `GET /api/needs`
- `GET /api/opportunities`
- `GET /api/events`
- `GET /api/jobs`
- `GET /api/admin/overview`
- `POST /api/mock-checkout`

Later integrations should keep this contract shape where practical, replacing static arrays with database-backed services.

## 7. Acceptance Criteria

- The repository has separate `frontend`, `backend`, and `admin-panel` top-level folders.
- The public frontend runs on localhost with no real API keys.
- The backend runs on localhost and returns dummy JSON.
- The admin panel runs separately on localhost with dummy operational data.
- The frontend covers the MVP modules from the source PRD, even where behavior is mocked.
- All API-key-dependent areas are labeled as dummy or placeholder behavior.
- A new PRD exists in `context/current-version-prd`.

## 8. Next Implementation Phase

After product review, replace dummy surfaces in this order:

1. Auth, account states, and profile storage.
2. Provider search and location ranking.
3. Need Requests, Opportunities, Events, and moderation.
4. Subscription billing with tested expiry math.
5. Referrals, wallet, withdrawals, and notifications.
6. Jobs, hire quotes, applicant scoring, and reviews.
7. PWA, SEO, analytics, and on-chain anchoring.
