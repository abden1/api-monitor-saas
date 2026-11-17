// Vercel build: generate the Prisma client, bring the database schema up to date when a database
// is connected, then build Next.js. Accepts the variable names Vercel's database integrations use.
import { execSync } from "node:child_process";

const env = { ...process.env };
env.DATABASE_URL ||= env.POSTGRES_PRISMA_URL || env.POSTGRES_URL || "";
env.DIRECT_URL ||= env.DATABASE_URL_UNPOOLED || env.POSTGRES_URL_NON_POOLING || env.DATABASE_URL;
const run = (cmd) => execSync(cmd, { stdio: "inherit", env });

run("npx prisma generate");
if (env.DATABASE_URL) {
  try {
    run("npx prisma db push --skip-generate");
  } catch {
    console.warn("\n⚠ prisma db push did not finish — the schema may need a manual migration. Building anyway.\n");
  }
} else {
  console.warn("\n⚠ No database connected (DATABASE_URL / POSTGRES_PRISMA_URL). Add one in Vercel → Storage.\n");
}
run("npx next build");
