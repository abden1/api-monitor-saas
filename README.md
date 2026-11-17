
## Deploying on Vercel (serverless mode)

The app runs on Vercel without Redis or a worker process:

1. **Database** — in the Vercel project, *Storage → Create Database → Neon (free)* and connect it to
   this project. The build (`scripts/vercel-build.mjs`) creates the tables automatically.
   Any Postgres works: `DATABASE_URL` (pooled) and `DIRECT_URL` are also accepted.
2. **Secrets** — `AUTH_SECRET` (any long random string), `ENCRYPTION_KEY` (64 hex characters),
   `NEXT_PUBLIC_APP_URL` (the site's address). Optional: `RESEND_API_KEY`, `STRIPE_*`, `TWILIO_*`, `CRON_SECRET`.
3. **Checks** — without `REDIS_URL`, due checks run from `/api/cron/checks`: every 5 minutes from
   GitHub Actions (`.github/workflows/uptime-checks.yml`), every minute while a dashboard is open,
   and daily from Vercel Cron (which also aggregates uptime and trims old data).
   With `REDIS_URL` set and `npm run worker` running somewhere, the BullMQ workers are used instead.
