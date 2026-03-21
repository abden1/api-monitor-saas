import { Worker } from "bullmq";
import Redis from "ioredis";
import { db } from "@/lib/db";
import { aggregateUptimeForDate } from "@/lib/uptime";
import { subDays, startOfDay } from "date-fns";

function createConnection() {
  const url = process.env.REDIS_URL!;
  return new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: url.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
  });
}

export function createUptimeWorker() {
  const worker = new Worker(
    "maintenance-ops",
    async (job) => {
      if (job.name === "aggregate-uptime") {
        await aggregateAllMonitorsUptime();
      } else if (job.name === "cleanup-old-data") {
        await cleanupOldData();
      }
    },
    {
      connection: createConnection(),
      concurrency: 5,
    }
  );

  return worker;
}

async function aggregateAllMonitorsUptime(): Promise<void> {
  const yesterday = subDays(new Date(), 1);
  const monitors = await db.monitor.findMany({
    select: { id: true },
  });

  let processed = 0;
  for (const monitor of monitors) {
    try {
      await aggregateUptimeForDate(monitor.id, yesterday);
      processed++;
    } catch (err) {
      console.error(`[Uptime] Failed to aggregate for monitor ${monitor.id}:`, err);
    }
  }

  console.log(`[Uptime] Aggregated ${processed}/${monitors.length} monitors for ${yesterday.toDateString()}`);
}

async function cleanupOldData(): Promise<void> {
  const retentionDays = 90;
  const cutoff = subDays(new Date(), retentionDays);

  const deleted = await db.checkResult.deleteMany({
    where: { timestamp: { lt: cutoff } },
  });

  console.log(`[Cleanup] Deleted ${deleted.count} check results older than ${retentionDays} days`);

  // Clean up old SSL history
  const sslDeleted = await db.sslHistory.deleteMany({
    where: { recordedAt: { lt: subDays(new Date(), 365) } },
  });

  console.log(`[Cleanup] Deleted ${sslDeleted.count} old SSL history records`);

  // Clean up old alert notifications
  const alertDeleted = await db.alertNotification.deleteMany({
    where: { createdAt: { lt: subDays(new Date(), 30) } },
  });

  console.log(`[Cleanup] Deleted ${alertDeleted.count} old alert notifications`);
}
