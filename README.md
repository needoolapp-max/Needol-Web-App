# Needol Web App

Needol is a dummy MVP web app for a global skills, services, opportunities, jobs, referrals, and admin moderation marketplace.

This repository contains three deployable apps:

- `frontend`: public website and logged-in member dashboard.
- `backend`: dummy Node API prepared for Render, Supabase demo persistence, and Resend.
- `admin-panel`: separate admin dashboard SPA.

Deployment and security setup notes are in:

- `context/deployment/free-dev-deployment-checklist.md`
- `context/deployment/security-preflight.md`
- `context/handoff.md`

## Local Development

```bash
npm install
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4100`
- Admin panel: `http://localhost:3200`

## Build

```bash
npm run build
```
