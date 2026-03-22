import { Queue } from "bullmq";

function getConnection() {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  const isTls = url.startsWith("rediss://");
  return {
    url,
    maxRetriesPerRequest: null as null,
    enableReadyCheck: false,
    lazyConnect: true,
    tls: isTls ? { rejectUnauthorized: false } : undefined,
  };
}

// Lazy singletons — only created when first accessed
let _monitorQueue: Queue | null = null;
let _alertQueue: Queue | null = null;
let _maintenanceQueue: Queue | null = null;

export function getMonitorQueue(): Queue {
  if (!_monitorQueue) {
    _monitorQueue = new Queue("monitor-checks", {
      connection: getConnection(),
      defaultJobOptions: { removeOnComplete: { count: 100 }, removeOnFail: { count: 500 } },
    });
  }
  return _monitorQueue;
}

export function getAlertQueue(): Queue {
  if (!_alertQueue) {
    _alertQueue = new Queue("alert-delivery", {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 500 },
      },
    });
  }
  return _alertQueue;
}

export function getMaintenanceQueue(): Queue {
  if (!_maintenanceQueue) {
    _maintenanceQueue = new Queue("maintenance-ops", {
      connection: getConnection(),
      defaultJobOptions: { removeOnComplete: { count: 100 }, removeOnFail: { count: 500 } },
    });
  }
  return _maintenanceQueue;
}

// Keep these as named exports for worker.ts compatibility
export const monitorQueue = { add: (...args: Parameters<Queue["add"]>) => getMonitorQueue().add(...args), getRepeatableJobs: () => getMonitorQueue().getRepeatableJobs(), removeRepeatableByKey: (key: string) => getMonitorQueue().removeRepeatableByKey(key) };
export const alertQueue = { add: (...args: Parameters<Queue["add"]>) => getAlertQueue().add(...args) };
export const maintenanceQueue = { add: (...args: Parameters<Queue["add"]>) => getMaintenanceQueue().add(...args) };

export async function addMonitorJob(monitorId: string, intervalSeconds: number) {
  await getMonitorQueue().add(
    `check-${monitorId}`,
    { monitorId },
    { repeat: { every: intervalSeconds * 1000 }, jobId: `monitor-${monitorId}` }
  );
}

export async function removeMonitorJob(monitorId: string) {
  const repeatableJobs = await getMonitorQueue().getRepeatableJobs();
  const job = repeatableJobs.find((j) => j.id === `monitor-${monitorId}`);
  if (job) await getMonitorQueue().removeRepeatableByKey(job.key);
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
