import { Worker } from "bullmq";
import Redis from "ioredis";
import { checkMonitor } from "@/lib/monitoring/check";

function createConnection() {
  const url = process.env.REDIS_URL!;
  return new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: url.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
  });
}

export function createMonitorWorker() {
  const worker = new Worker(
    "monitor-checks",
    async (job) => checkMonitor(job.data.monitorId as string),
    {
      connection: createConnection(),
      concurrency: 20,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`[Worker] Monitor check failed for job ${job?.id}:`, err.message);
  });

  return worker;
}
