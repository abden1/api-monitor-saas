import "dotenv/config";
import { createMonitorWorker } from "@/workers/monitor.worker";
import { createAlertWorker } from "@/workers/alert.worker";
import { createUptimeWorker } from "@/workers/uptime.worker";
import { scheduleAllMonitors } from "@/lib/queue";
import { maintenanceQueue } from "@/lib/queue";

async function main() {
  console.log("[Worker] Starting API Monitor background workers...");

  // Start all workers
  const monitorWorker = createMonitorWorker();
  const alertWorker = createAlertWorker();
  const uptimeWorker = createUptimeWorker();

  console.log("[Worker] Monitor worker started (concurrency: 20)");
  console.log("[Worker] Alert worker started (concurrency: 10)");
  console.log("[Worker] Uptime/Cleanup worker started");

  // Schedule all active monitors
  await scheduleAllMonitors();

  // Schedule hourly uptime aggregation
  await maintenanceQueue.add(
    "aggregate-uptime",
    {},
    {
      repeat: { pattern: "0 * * * *" }, // every hour
      jobId: "uptime-aggregation",
    }
  );

  // Schedule weekly data cleanup
  await maintenanceQueue.add(
    "cleanup-old-data",
    {},
    {
      repeat: { pattern: "0 3 * * 0" }, // every Sunday at 3am
      jobId: "data-cleanup",
    }
  );

  console.log("[Worker] Scheduled recurring jobs: uptime aggregation (hourly), cleanup (weekly)");
  console.log("[Worker] All workers running. Press Ctrl+C to stop.");

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    console.log("[Worker] Shutting down...");
    await monitorWorker.close();
    await alertWorker.close();
    await uptimeWorker.close();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("[Worker] Shutting down...");
    await monitorWorker.close();
    await alertWorker.close();
    await uptimeWorker.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("[Worker] Fatal error:", err);
  process.exit(1);
});
