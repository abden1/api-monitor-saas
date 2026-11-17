// Vercel's database integrations (Neon, Supabase, Prisma Postgres) name their connection strings
// differently. Accept all of them, so connecting a database in the Vercel dashboard is enough.
const pick = (...names: string[]) => names.map((n) => process.env[n]).find((v) => !!v);

const pooled = pick("DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL");
if (pooled && !process.env.DATABASE_URL) process.env.DATABASE_URL = pooled;

const direct = pick("DIRECT_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING") ?? pooled;
if (direct && !process.env.DIRECT_URL) process.env.DIRECT_URL = direct;

/** With no Redis, the app runs in serverless mode: checks run from /api/cron/checks. */
export const hasRedis = Boolean(process.env.REDIS_URL);
