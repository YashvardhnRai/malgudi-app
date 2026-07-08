# Malgudi Operations

Mobile-first restaurant operations for CEOs, managers, and staff. The app tracks four general shift checks plus eight counter-temperature rounds, photo proof, sales, attendance, inventory/wastage, cash closing, complaints, manager presence, alerts, daily reports, and employee access.

## Roles

- `CEO`: all outlets, dashboard, cash-closing review, complaints, launch kit, users, and audit history.
- `MANAGER`: assigned outlet shift board, attendance, photo proof, sales, inventory/wastage, cash closing, and issue reporting.
- `STAFF`: assigned outlet worker home, attendance, shift proof, inventory/wastage, cash closing, and issue reporting.

Users sign in through Supabase magic links. Create manager and staff access from `/admin/users`. Operational pages and outlet data require an approved `CEO`, `MANAGER`, or `STAFF` profile.

## Daily Schedule

All times are Asia/Kolkata.

General checks: `08:00` opening, `16:00` cleanliness, `20:00` cleanliness, `22:00` closing.

Counter temperature rounds: `07:30`, `09:30`, `11:30`, `13:30`, `15:30`, `17:30`, `19:30`, and `21:30`.

Every counter round requires five fresh photos:

1. All batter types, with thermometer reading.
2. Coconut chutney, with thermometer reading.
3. Red chutney, with thermometer reading.
4. Sambar, with thermometer reading.
5. One wide photo of the full kitchen counter.

A slot becomes overdue after 30 minutes. Reminder rows are deduplicated by outlet, date, and slot.

Cash closing is due daily at `22:30`. Staff count the drawer, reconcile the POS cash total, name the counter and verifier, and attach cash-count and POS-report photos. The CEO sees expected cash, physical cash, variance, proofs, and submission time for every outlet. Missing submissions, missing proof, missing verification, shortages, excesses, and absolute differences above `Rs 500` generate alerts.

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

Run migrations in **Supabase Dashboard -> SQL Editor -> New query**. Open each file locally, paste the entire SQL into the editor, and click **Run**. Run one file at a time in this order:

1. `supabase/migrations/20260606_production_hardening.sql`
2. `supabase/migrations/20260619_restaurant_features.sql`
3. `supabase/migrations/20260630_counter_temperature_rounds.sql`
4. `supabase/migrations/20260708_cash_closing.sql`

For a completely fresh project, apply `supabase/schema.sql` and `supabase/migration_notifications.sql` before the migrations above.

The hardening migration removes direct client mutation policies, makes the photo bucket private, and limits authenticated reads to CEOs or the user's assigned outlet. All writes pass through authenticated Next.js route handlers, and photo pages use short-lived signed URLs.

The restaurant features migration adds shift attendance and inventory/wastage logs. The counter-round migration adds the eight daily rounds and five required proof readings. The cash-closing migration adds server-calculated reconciliation totals, proof fields, role-scoped access, and database-enforced status rules. The app shows a pending-migration notice until the SQL has been applied.

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
3. Complete one five-photo counter round from a phone and confirm all readings/photos appear for the CEO.
4. Submit attendance, sales, inventory/wastage, cash closing, and an issue from a manager account.
5. Open `/reports/daily`, export CSV, and print/save the PDF report.
6. Enable phone alerts from the CEO notification menu.
7. Run the Restaurant reminders workflow manually once.

Optional email alerts use Resend through `RESEND_API_KEY` and `ALERT_FROM_EMAIL`.
Optional SMS and WhatsApp alerts use Twilio through `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_SMS`, and `TWILIO_FROM_WHATSAPP`.
