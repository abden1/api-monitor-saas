import { addMonitorJob, removeMonitorJob } from "@/lib/queue";
import type { Monitor } from "@prisma/client";

export async function scheduleMonitor(monitor: Pick<Monitor, "id" | "interval" | "isActive">) {
  if (!monitor.isActive) return;
  await addMonitorJob(monitor.id, monitor.interval);
}

export async function unscheduleMonitor(monitorId: string) {
  await removeMonitorJob(monitorId);
}

export async function rescheduleMonitor(
  monitor: Pick<Monitor, "id" | "interval" | "isActive">
) {
  await unscheduleMonitor(monitor.id);
  if (monitor.isActive) {
    await scheduleMonitor(monitor);
  }
}
