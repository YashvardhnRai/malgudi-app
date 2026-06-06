# Malgudi Operations

Mobile-first restaurant operations for CEOs, managers, and staff. The app tracks eight daily proof slots, photo uploads with AI review, sales, complaints, manager presence, alerts, and user access.

## Roles

- `CEO`: all outlets, dashboard, complaints, launch kit, users, audit history.
- `MANAGER`: assigned outlet shift board, photo proof, sales, and issue reporting.
- `STAFF`: assigned outlet worker home, shift proof, and issue reporting.

Users sign in through Supabase magic links. Create manager and staff access from `/admin/users`.

## Daily Schedule

All times are Asia/Kolkata:

`08:00` opening, `10:00` Banmarie, `12:00` Banmarie, `14:00` Banmarie, `16:00` cleanliness, `18:00` Banmarie, `20:00` cleanliness, `22:00` closing.

A slot becomes overdue after 30 minutes. Reminder rows are deduplicated by outlet, date, and slot.

## Local Development

```powershell
npm install
npm run dev
```

Open `http://localhost:3001`. The project intentionally uses webpack for local development.

Quality gates:

```powershell
npm run lint
npm run test:run
npm run build
```

## Environment

Copy `.env.example` to `.env.local` and supply Supabase, AI, scheduler, and optional email delivery values. Never expose the service role key or `CRON_SECRET` through a `NEXT_PUBLIC_` variable.

## Database

1. Apply `supabase/schema.sql` for a fresh project.
2. Apply `supabase/migration_notifications.sql`.
3. Apply `supabase/migrations/20260606_production_hardening.sql`.
4. Confirm the `photos` storage bucket exists and remains public-read.

The hardening migration removes direct client mutation policies and limits authenticated reads to CEOs or the user’s assigned outlet. All writes pass through authenticated Next.js route handlers.

## Reminders

Vercel Hobby supports only one cron execution per day. The project therefore includes:

- A daily Vercel safety run in `vercel.json`.
- A secure CEO-dashboard fallback while the dashboard is open.
- `.github/workflows/restaurant-reminders.yml` for 15-minute checks.

Set `CRON_SECRET` in Vercel for the daily Vercel invocation. The GitHub workflow needs no shared secret: it uses a short-lived GitHub Actions OIDC token restricted to this repository, workflow, event, and `main` branch.

## Deployment

Push `main` to deploy through the linked Vercel project. After deployment:

1. Check `/api/health` returns `status: ok`.
2. Sign in with each role and verify role routing.
3. Upload one photo from a phone and confirm it appears on the CEO dashboard.
4. Submit sales and an issue from a manager account.
5. Enable phone alerts from the CEO notification menu.
6. Run the Restaurant reminders workflow manually once.

Optional email alerts use Resend through `RESEND_API_KEY` and `ALERT_FROM_EMAIL`.
