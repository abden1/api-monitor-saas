import { db } from "@/lib/db";
import { checkMonitor } from "@/lib/monitoring/check";

/**
 * Serverless scheduling: finds every active monitor whose interval has passed and checks it,
 * most overdue first, five at a time, until the time budget is spent.
 */
export async function runDueChecks({ limit = 25, budgetMs = 45_000 }: { limit?: number; budgetMs?: number } = {}) {
  const started = Date.now();
  const monitors = await db.monitor.findMany({
    where: { isActive: true },
    select: { id: true, interval: true, lastCheckedAt: true },
  });
  const now = Date.now();
  const due = monitors
    .map((m) => ({ id: m.id, late: m.lastCheckedAt ? now - m.lastCheckedAt.getTime() - m.interval * 1000 : Number.MAX_SAFE_INTEGER }))
    .filter((m) => m.late >= -5_000)
    .sort((a, b) => b.late - a.late)
    .slice(0, limit);

  let checked = 0;
  let failed = 0;
  for (let i = 0; i < due.length; i += 5) {
    if (Date.now() - started > budgetMs) break;
    await Promise.all(
      due.slice(i, i + 5).map((m) =>
        checkMonitor(m.id)
          .then(() => void checked++)
          .catch((err: unknown) => {
            failed++;
            console.error(`[Checks] ${m.id}:`, err instanceof Error ? err.message : err);
          })
      )
    );
  }
  return { active: monitors.length, due: due.length, checked, failed, ms: Date.now() - started };
}
