import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runDueChecks } from "@/lib/monitoring/run-due";
import { aggregateAllMonitorsUptime, cleanupOldData } from "@/lib/maintenance";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Runs the checks that are due. Called by Vercel Cron (daily, with ?daily=1 for upkeep), by the
 * GitHub Actions schedule in .github/workflows/uptime-checks.yml (every 5 minutes), and every
 * minute by an open dashboard. With CRON_SECRET set, schedulers must send it as a Bearer token;
 * signed-in users may always trigger a run.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const bearer = req.headers.get("authorization") === `Bearer ${secret}`;
  if (secret && !bearer) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const daily = req.nextUrl.searchParams.get("daily") === "1";
  if (daily) {
    await aggregateAllMonitorsUptime().catch((e: unknown) => console.error("[Upkeep] uptime:", e));
    await cleanupOldData().catch((e: unknown) => console.error("[Upkeep] cleanup:", e));
  }
  const result = await runDueChecks({ budgetMs: daily ? 30_000 : 45_000 });
  return NextResponse.json({ ok: true, daily, ...result });
}
