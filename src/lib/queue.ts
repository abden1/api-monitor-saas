import { Queue, QueueOptions } from "bullmq";
import Redis from "ioredis";

function createConnection() {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL not set");

  return new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    tls: url.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
  });
}

const defaultOptions: QueueOptions = {
  connection: createConnection(),
  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
};

export const monitorQueue = new Queue("monitor-checks", defaultOptions);

export const alertQueue = new Queue("alert-delivery", {
  ...defaultOptions,
  connection: createConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 500 },
  },
});

export const maintenanceQueue = new Queue("maintenance-ops", {
  ...defaultOptions,
  connection: createConnection(),
});

export async function addMonitorJob(monitorId: string, intervalSeconds: number) {
  await monitorQueue.add(
    `check-${monitorId}`,
    { monitorId },
    {
      repeat: { every: intervalSeconds * 1000 },
      jobId: `monitor-${monitorId}`,
    }
  );
}

export async function removeMonitorJob(monitorId: string) {
  const repeatableJobs = await monitorQueue.getRepeatableJobs();
  const job = repeatableJobs.find((j) => j.id === `monitor-${monitorId}`);
  if (job) {
    await monitorQueue.removeRepeatableByKey(job.key);
  }
}

export async function scheduleAllMonitors() {
  const { db } = await import("@/lib/db");
  const monitors = await db.monitor.findMany({
    where: { isActive: true },
    select: { id: true, interval: true },
  });

  for (const monitor of monitors) {
    await addMonitorJob(monitor.id, monitor.interval);
  }
  console.log(`[Queue] Scheduled ${monitors.length} monitors`);
}
