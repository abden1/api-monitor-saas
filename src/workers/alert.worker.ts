import { Worker } from "bullmq";
import Redis from "ioredis";
import { db } from "@/lib/db";
import { decryptJson } from "@/lib/encryption";
import { sendEmailAlert } from "@/lib/alerts/email";
import { sendSmsAlert } from "@/lib/alerts/sms";
import { sendSlackAlert } from "@/lib/alerts/slack";
import { sendDiscordAlert } from "@/lib/alerts/discord";
import { sendPagerDutyAlert } from "@/lib/alerts/pagerduty";
import { sendOpsgenieAlert } from "@/lib/alerts/opsgenie";
import { sendWebhookAlert } from "@/lib/alerts/webhook";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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
    async (job) => {
      const { monitorId, channelId, trigger, channelType, channelConfig, details } = job.data;

      const monitor = await db.monitor.findUnique({
        where: { id: monitorId },
        select: { name: true, url: true, teamId: true },
      });

      if (!monitor) return;

      const config = decryptJson<Record<string, unknown>>(channelConfig);
      const dashboardUrl = `${APP_URL}/monitors/${monitorId}`;

      const alertData = {
        monitorName: monitor.name,
        monitorUrl: monitor.url,
        status: getStatusLabel(trigger),
        trigger,
        responseTime: (details?.responseTime as number) || null,
        errorMessage: (details?.errorMessage as string) || null,
        monitorId,
        dashboardUrl,
        timestamp: new Date(),
      };

      try {
        switch (channelType) {
          case "EMAIL":
            await sendEmailAlert(config as { to: string | string[] }, alertData);
            break;
          case "SMS":
            await sendSmsAlert(config as { to: string | string[] }, alertData);
            break;
          case "SLACK":
            await sendSlackAlert(config as { webhookUrl: string }, alertData);
            break;
          case "DISCORD":
            await sendDiscordAlert(config as { webhookUrl: string }, alertData);
            break;
          case "PAGERDUTY":
            await sendPagerDutyAlert(config as { integrationKey: string }, alertData);
            break;
          case "OPSGENIE":
            await sendOpsgenieAlert(config as { apiKey: string }, alertData);
            break;
          case "WEBHOOK":
            await sendWebhookAlert(config as { url: string; secret?: string }, alertData);
            break;
          default:
            throw new Error(`Unknown channel type: ${channelType}`);
        }

        // Mark as sent
        await db.alertNotification.updateMany({
          where: { monitorId, channelId, trigger, status: "PENDING" },
          data: { status: "SENT", sentAt: new Date() },
        });

        console.log(`[Alert] Sent ${trigger} alert to ${channelType} for monitor ${monitorId}`);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        await db.alertNotification.updateMany({
          where: { monitorId, channelId, trigger, status: "PENDING" },
          data: { status: "FAILED", error: errorMsg },
        });
        throw err; // Allow BullMQ retry
      }
    },
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

function getStatusLabel(trigger: string): string {
  switch (trigger) {
    case "DOWN": return "DOWN";
    case "RECOVERY": return "UP";
    case "DEGRADED": return "DEGRADED";
    case "SSL_EXPIRY_7": return "SSL EXPIRING IN 7 DAYS";
    case "SSL_EXPIRY_14": return "SSL EXPIRING IN 14 DAYS";
    case "SSL_EXPIRY_30": return "SSL EXPIRING IN 30 DAYS";
    default: return trigger;
  }
}
