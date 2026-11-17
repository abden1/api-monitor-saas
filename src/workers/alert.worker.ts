import { Worker } from "bullmq";
import Redis from "ioredis";
import { deliverAlert, type AlertJob } from "@/lib/alerts/deliver";

function createConnection() {
  const url = process.env.REDIS_URL!;
  return new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: url.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
  });
}

export function createAlertWorker() {
  const worker = new Worker(
    "alert-delivery",
    // deliverAlert rethrows on failure, so BullMQ still retries.
    async (job) => deliverAlert(job.data as AlertJob),
    {
      connection: createConnection(),
      concurrency: 10,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`[Alert Worker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
