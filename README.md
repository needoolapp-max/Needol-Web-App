# Needol Web App

Needol is a dummy MVP web app for a global skills, services, opportunities, jobs, referrals, and admin moderation marketplace.

This repository contains three deployable apps:

- `frontend`: public website and logged-in member dashboard.
- `backend`: dummy Node API prepared for Render, Supabase demo persistence, and Resend.
- `admin-panel`: separate admin dashboard SPA.

Deployment, security, PRD, and continuation notes are consolidated in:

- `context/handover.md`

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

For Vercel/Netlify, deploy the public site from the `frontend` root directory with:

```bash
npm run build
```

Use `dist` as the output directory.
