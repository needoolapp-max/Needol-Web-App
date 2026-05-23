# Needool GitHub Security Preflight

Run through this before pushing the repo to GitHub.

## Must Not Be Committed

- `.env`
- `.env.local`
- `.env.production`
- Supabase service role keys
- Resend API keys
- Render tokens
- Vercel/Netlify tokens
- Private wallet keys
- NowPayments keys
- Google Maps keys
- Real user data
- Hardware wallet details

The root `.gitignore` blocks common environment files and the local dummy data file.

## Known Demo-Only Security Limits

The current deployment preparation is safe for a founder-review dummy demo, not production:

- Local auth still stores demo passwords in the dummy store.
- Tokens are still dummy user IDs.
- Admin token protection is optional and browser-visible if used by the admin panel.
- Supabase is currently used as a single JSON state store, not the final normalized schema.
- Real Supabase Auth, password hashing, TOTP, RLS, storage policies, and admin roles are not implemented yet.

## Safer Demo Settings

- Set `ALLOWED_ORIGINS` on Render to only the deployed frontend and admin URLs.
- Set `ADMIN_API_TOKEN` on Render.
- Set `VITE_ADMIN_API_TOKEN` on the admin panel only if using the demo token gate.
- Protect the admin panel URL with Cloudflare Access, Vercel password protection, or Netlify password protection.
- Keep Supabase buckets private.
- Keep `RESEND_API_KEY` only on Render.

## Quick Local Checks

```powershell
rg -n "SUPABASE_SERVICE_ROLE_KEY|RESEND_API_KEY|ADMIN_API_TOKEN|sk_|re_|eyJ|BEGIN PRIVATE KEY|NOWPAYMENTS|GOOGLE_MAPS" . -g "!node_modules" -g "!dist" -g "!frontend/dist" -g "!admin-panel/dist"
git status --short
```

Only placeholders and documentation should appear. Real secret values should never appear.

## Production Work Still Required

- Replace dummy auth with Supabase Auth or a production auth provider.
- Add proper admin auth and authorization.
- Normalize the Supabase database schema from the PRD.
- Add RLS policies for all real tables.
- Add password reset, email verification, and TOTP withdrawal gating.
- Add rate limiting and abuse prevention.
- Move payment, referral commission, and subscription expiry logic server-side.
- Add webhook signature verification for payment events.
- Add logging and monitoring without leaking PII.
