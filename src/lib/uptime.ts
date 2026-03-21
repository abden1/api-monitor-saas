import { db } from "@/lib/db";
import { subDays, startOfDay, format } from "date-fns";

export async function getUptimeStats(
  monitorId: string,
  days: number = 30
): Promise<{
  uptimePercent: number;
  avgResponseTime: number | null;
  totalChecks: number;
  failCount: number;
  dailyStats: Array<{
    date: string;
    uptimePercent: number;
    avgResponseTime: number | null;
  }>;
}> {
  const since = subDays(new Date(), days);

  const dailyStats = await db.uptimeDaily.findMany({
    where: {
      monitorId,
      date: { gte: startOfDay(since) },
    },
    orderBy: { date: "asc" },
  });

  if (dailyStats.length === 0) {
    return {
      uptimePercent: 100,
      avgResponseTime: null,
      totalChecks: 0,
      failCount: 0,
      dailyStats: [],
    };
  }

  const totalChecks = dailyStats.reduce((sum, d) => sum + d.checkCount, 0);
  const totalFails = dailyStats.reduce((sum, d) => sum + d.failCount, 0);
  const uptimePercent =
    totalChecks > 0
      ? ((totalChecks - totalFails) / totalChecks) * 100
      : 100;

  const responseTimes = dailyStats
    .filter((d) => d.avgResponseTime !== null)
    .map((d) => d.avgResponseTime as number);

  const avgResponseTime =
    responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : null;

  return {
    uptimePercent: Math.round(uptimePercent * 100) / 100,
    avgResponseTime,
    totalChecks,
    failCount: totalFails,
    dailyStats: dailyStats.map((d) => ({
      date: format(d.date, "yyyy-MM-dd"),
      uptimePercent: d.uptimePercent,
      avgResponseTime: d.avgResponseTime,
    })),
  };
}

export async function aggregateUptimeForDate(
  monitorId: string,
  date: Date
): Promise<void> {
  const dayStart = startOfDay(date);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const results = await db.checkResult.findMany({
    where: {
      monitorId,
      timestamp: { gte: dayStart, lt: dayEnd },
    },
    select: { status: true, responseTime: true },
  });

  if (results.length === 0) return;

  const failCount = results.filter((r) => r.status === "DOWN").length;
  const degradedCount = results.filter((r) => r.status === "DEGRADED").length;
  const responseTimes = results
    .filter((r) => r.responseTime !== null)
    .map((r) => r.responseTime as number);

  const avgResponseTime =
    responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : null;

  const uptimePercent =
    ((results.length - failCount) / results.length) * 100;

  await db.uptimeDaily.upsert({
    where: { monitorId_date: { monitorId, date: dayStart } },
    create: {
      monitorId,
      date: dayStart,
      uptimePercent: Math.round(uptimePercent * 100) / 100,
      avgResponseTime,
      checkCount: results.length,
      failCount,
      degradedCount,
    },
    update: {
      uptimePercent: Math.round(uptimePercent * 100) / 100,
      avgResponseTime,
      checkCount: results.length,
      failCount,
      degradedCount,
    },
  });
}

export function formatUptime(percent: number): string {
  return `${percent.toFixed(2)}%`;
}

export function getUptimeColor(percent: number): string {
  if (percent >= 99.9) return "text-green-500";
  if (percent >= 99.0) return "text-yellow-500";
  if (percent >= 95.0) return "text-orange-500";
  return "text-red-500";
}
