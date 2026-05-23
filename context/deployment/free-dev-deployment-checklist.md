# Needool Free Dev Deployment Checklist

This checklist prepares a founder-review deployment with no real production secrets committed to GitHub.

## 1. Supabase

1. Create a Supabase project on the free plan.
2. Open SQL Editor.
3. Run `context/deployment/supabase-demo-state.sql`.
4. Copy these values for Render environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Do not put `SUPABASE_SERVICE_ROLE_KEY` in Vercel, Netlify, the frontend, or the admin panel.

## 2. Render Backend

Create a Render web service from the GitHub repo using `render.yaml`, or configure manually:

- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/health`
- Plan: Free

Render environment variables:

```text
NODE_ENV=production
DATA_PROVIDER=supabase
SUPABASE_URL=<from Supabase>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase>
SUPABASE_STATE_TABLE=needool_app_state
SUPABASE_STATE_KEY=dummy_store
ALLOWED_ORIGINS=https://your-frontend-url,https://your-admin-url
ADMIN_API_TOKEN=<long random demo token>
RESEND_API_KEY=<optional for now>
RESEND_FROM_EMAIL=Needool <hello@your-domain>
```

After deploy, open:

```text
https://your-render-service.onrender.com/health
```

## 3. UptimeRobot

Create one HTTP monitor:

- URL: `https://your-render-service.onrender.com/health`
- Interval: 5 minutes
- Expected status: 200

This is meant to keep Render's free web service warm during the founder-review phase. It is not a production reliability strategy.

## 4. Frontend

Deploy `frontend` to Vercel or Netlify.

Suggested settings:

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory for static hosting: `dist`

Environment variable:

```text
VITE_API_BASE_URL=https://your-render-service.onrender.com
VITE_ADMIN_PANEL_URL=https://your-admin-url
```

## 5. Admin Panel

Deploy `admin-panel` as a separate Vercel or Netlify project.

Suggested settings:

- Root directory: `admin-panel`
- Build command: `npm run build`
- Output directory: `dist`

Environment variables:

```text
VITE_API_BASE_URL=https://your-render-service.onrender.com
VITE_PUBLIC_SITE_URL=https://your-frontend-url
VITE_ADMIN_API_TOKEN=<same demo token as Render ADMIN_API_TOKEN>
```

Important: `VITE_ADMIN_API_TOKEN` is visible in the browser bundle. Use it only for the dummy founder-review deployment. For real production, protect admin with real auth and Cloudflare Access or the hosting platform's access controls.

## 6. Resend

For now, Resend is optional. If configured:

1. Create a Resend account.
2. Verify the sending domain.
3. Add the API key only to Render as `RESEND_API_KEY`.
4. Set `RESEND_FROM_EMAIL` to a verified sender.

No Resend key belongs in frontend/admin environment variables.

## 7. Before Sharing The Link

- Confirm `/health` returns `ok: true`.
- Confirm frontend signup/login works.
- Confirm admin dashboard can read users/events.
- Confirm Supabase `needool_app_state` row is created after first API use.
- Confirm no real secrets are committed to GitHub.
