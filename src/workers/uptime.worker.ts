import { Worker } from "bullmq";
import Redis from "ioredis";
import { aggregateAllMonitorsUptime, cleanupOldData } from "@/lib/maintenance";

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
