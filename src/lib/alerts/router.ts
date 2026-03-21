import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { alertQueue } from "@/lib/queue";
import type { AlertTrigger, Monitor } from "@prisma/client";

interface AlertEvent {
  monitorId: string;
  trigger: AlertTrigger;
  monitor?: Partial<Monitor>;
  details?: Record<string, unknown>;
}

const ALERT_COOLDOWN_SECONDS = 15 * 60; // 15 minutes

export async function routeAlert(event: AlertEvent): Promise<void> {
  const { monitorId, trigger } = event;

  // Check if in maintenance window
  const monitor = await db.monitor.findUnique({
    where: { id: monitorId },
    select: { teamId: true },
  });

  if (!monitor) return;

  const now = new Date();
  const maintenanceWindow = await db.maintenanceWindow.findFirst({
    where: {
      teamId: monitor.teamId,
      monitorIds: { has: monitorId },
      startAt: { lte: now },
      endAt: { gte: now },
    },
  });

  if (maintenanceWindow) {
    console.log(`[Alert] Monitor ${monitorId} is in maintenance window, skipping alert`);
    return;
  }

  // Find matching alert rules
  const rules = await db.alertRule.findMany({
    where: {
      monitorId,
      trigger,
      enabled: true,
      channel: { enabled: true },
    },
    include: { channel: true },
  });

  if (rules.length === 0) return;

  for (const rule of rules) {
    // Check throttle (skip if alerted recently for DOWN events)
    if (trigger === "DOWN" || trigger === "DEGRADED") {
      const cooldownKey = `alert:cooldown:${monitorId}:${rule.channelId}:${trigger}`;
      const existing = await redis.get(cooldownKey);
      if (existing) {
        console.log(`[Alert] Cooldown active for monitor ${monitorId} channel ${rule.channelId}`);
        continue;
      }
      await redis.setex(cooldownKey, ALERT_COOLDOWN_SECONDS, "1");
    }

    // Queue alert delivery job
    await alertQueue.add(
      `alert-${monitorId}-${rule.channelId}`,
      {
        monitorId,
        channelId: rule.channelId,
        trigger,
        channelType: rule.channel.type,
        channelConfig: rule.channel.config,
        details: event.details || {},
      },
      { priority: trigger === "DOWN" ? 1 : 5 }
    );

    // Create notification record
    await db.alertNotification.create({
      data: {
        monitorId,
        channelId: rule.channelId,
        trigger,
        status: "PENDING",
      },
    });
  }
}

export async function clearAlertCooldown(
  monitorId: string,
  channelId?: string
): Promise<void> {
  if (channelId) {
    const keys = [
      `alert:cooldown:${monitorId}:${channelId}:DOWN`,
      `alert:cooldown:${monitorId}:${channelId}:DEGRADED`,
    ];
    await redis.del(...keys);
  } else {
    const keys = await redis.keys(`alert:cooldown:${monitorId}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
