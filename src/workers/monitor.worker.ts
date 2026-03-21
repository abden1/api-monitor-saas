import { Worker } from "bullmq";
import Redis from "ioredis";
import { db } from "@/lib/db";
import { executeCheckWithRetry } from "@/lib/monitoring/executor";
import { routeAlert, clearAlertCooldown } from "@/lib/alerts/router";
import { redis } from "@/lib/redis";
import type { MonitorStatus } from "@prisma/client";

const REGIONS = ["us-east", "us-west", "europe", "asia", "australia"];

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
    async (job) => {
      const { monitorId } = job.data;

      const monitor = await db.monitor.findUnique({
        where: { id: monitorId },
        include: { team: true },
      });

      if (!monitor || !monitor.isActive) return;

      // Check maintenance window
      const now = new Date();
      const inMaintenance = await db.maintenanceWindow.findFirst({
        where: {
          teamId: monitor.teamId,
          monitorIds: { has: monitorId },
          startAt: { lte: now },
          endAt: { gte: now },
        },
      });

      if (inMaintenance) {
        console.log(`[Worker] Monitor ${monitorId} is in maintenance, skipping check`);
        return;
      }

      // Determine regions to check
      const regionsToCheck = monitor.regions.length > 0
        ? monitor.regions
        : ["us-east"];

      // Execute checks for each region (in parallel)
      const checkPromises = regionsToCheck.map((region) =>
        executeCheckWithRetry(
          {
            id: monitor.id,
            url: monitor.url,
            type: monitor.type,
            method: monitor.method,
            headers: monitor.headers,
            body: monitor.body,
            expectedStatus: monitor.expectedStatus,
            expectedContent: monitor.expectedContent,
            contentType: monitor.contentType,
            timeout: monitor.timeout,
            responseTimeThreshold: monitor.responseTimeThreshold,
          },
          3
        ).then((result) => ({ region, ...result }))
      );

      const results = await Promise.allSettled(checkPromises);
      const checkResults = results
        .filter((r): r is PromiseFulfilledResult<{
          region: string;
          status: "UP" | "DOWN" | "DEGRADED";
          responseTime: number | null;
          statusCode: number | null;
          errorMessage: string | null;
          sslInfo?: {
            expiresAt: Date | null;
            issuer: string | null;
            subject: string | null;
            isValid: boolean;
            isSelfSigned: boolean;
            daysUntilExpiry: number | null;
          };
        }> => r.status === "fulfilled")
        .map((r) => r.value);

      if (checkResults.length === 0) return;

      // Save check results to DB
      await db.checkResult.createMany({
        data: checkResults.map((r) => ({
          monitorId,
          region: r.region,
          status: r.status,
          responseTime: r.responseTime,
          statusCode: r.statusCode,
          errorMessage: r.errorMessage,
          sslExpiresAt: r.sslInfo?.expiresAt,
        })),
      });

      // Compute aggregate status (down if 2+ regions fail or all fail)
      const downCount = checkResults.filter((r) => r.status === "DOWN").length;
      const degradedCount = checkResults.filter((r) => r.status === "DEGRADED").length;

      let aggregateStatus: "UP" | "DOWN" | "DEGRADED";
      if (downCount >= Math.max(2, Math.ceil(checkResults.length / 2))) {
        aggregateStatus = "DOWN";
      } else if (downCount > 0 || degradedCount > 0) {
        aggregateStatus = "DEGRADED";
      } else {
        aggregateStatus = "UP";
      }

      const prevStatus = monitor.status;
      const newStatus = aggregateStatus as MonitorStatus;

      // Update SSL info if available
      const sslResult = checkResults.find((r) => r.sslInfo);
      const sslUpdateData = sslResult?.sslInfo
        ? { sslExpiresAt: sslResult.sslInfo.expiresAt }
        : {};

      // Check SSL expiry alerts
      if (sslResult?.sslInfo?.daysUntilExpiry !== null && sslResult?.sslInfo?.daysUntilExpiry !== undefined) {
        const days = sslResult.sslInfo.daysUntilExpiry;
        const triggers = [];
        if (days <= 7) triggers.push("SSL_EXPIRY_7" as const);
        else if (days <= 14) triggers.push("SSL_EXPIRY_14" as const);
        else if (days <= 30) triggers.push("SSL_EXPIRY_30" as const);

        for (const trigger of triggers) {
          const cooldownKey = `ssl:alert:${monitorId}:${trigger}`;
          const existing = await redis.get(cooldownKey);
          if (!existing) {
            await redis.setex(cooldownKey, 24 * 60 * 60, "1"); // 24h cooldown
            await routeAlert({
              monitorId,
              trigger,
              details: { daysUntilExpiry: days, expiresAt: sslResult.sslInfo.expiresAt?.toISOString() },
            });
          }
        }

        if (sslResult.sslInfo.issuer || sslResult.sslInfo.expiresAt) {
          await db.sslHistory.create({
            data: {
              monitorId,
              issuer: sslResult.sslInfo.issuer,
              subject: sslResult.sslInfo.subject,
              validTo: sslResult.sslInfo.expiresAt,
              isValid: sslResult.sslInfo.isValid,
              isSelfSigned: sslResult.sslInfo.isSelfSigned,
              daysUntilExpiry: sslResult.sslInfo.daysUntilExpiry,
            },
          });
        }
      }

      // Update monitor status
      const statusChanged = prevStatus !== newStatus && prevStatus !== "PAUSED" && prevStatus !== "PENDING";

      await db.monitor.update({
        where: { id: monitorId },
        data: {
          status: newStatus,
          lastCheckedAt: now,
          ...(statusChanged && { lastStatusChange: now }),
          ...sslUpdateData,
        },
      });

      // Handle status change events
      if (statusChanged) {
        console.log(`[Worker] Monitor ${monitorId}: ${prevStatus} -> ${newStatus}`);

        if (newStatus === "DOWN" || newStatus === "DEGRADED") {
          // Auto-create incident
          await handleMonitorDown(monitorId, monitor.teamId, monitor.name, newStatus, checkResults[0]?.errorMessage);

          await routeAlert({
            monitorId,
            trigger: newStatus === "DOWN" ? "DOWN" : "DEGRADED",
            details: {
              monitorName: monitor.name,
              monitorUrl: monitor.url,
              status: newStatus,
              errorMessage: checkResults[0]?.errorMessage,
              responseTime: checkResults[0]?.responseTime,
            },
          });
        } else if (newStatus === "UP" && (prevStatus === "DOWN" || prevStatus === "DEGRADED")) {
          // Auto-resolve incident
          await handleMonitorRecovery(monitorId, monitor.teamId);

          // Clear alert cooldowns on recovery
          await clearAlertCooldown(monitorId);

          await routeAlert({
            monitorId,
            trigger: "RECOVERY",
            details: {
              monitorName: monitor.name,
              monitorUrl: monitor.url,
              status: "UP",
              responseTime: checkResults[0]?.responseTime,
            },
          });
        }

        // Publish SSE event
        await redis.publish(
          `team:${monitor.teamId}:events`,
          JSON.stringify({
            type: "monitor_status_change",
            monitorId,
            previousStatus: prevStatus,
            status: newStatus,
            timestamp: now.toISOString(),
          })
        );
      }
    },
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

async function handleMonitorDown(
  monitorId: string,
  teamId: string,
  monitorName: string,
  status: string,
  errorMessage?: string | null
): Promise<void> {
  const existingIncident = await db.incident.findFirst({
    where: {
      monitorId,
      status: { not: "RESOLVED" },
    },
  });

  if (existingIncident) return;

  await db.incident.create({
    data: {
      teamId,
      monitorId,
      title: `${monitorName} is ${status}`,
      description: errorMessage || `Automatic incident created because ${monitorName} went ${status}`,
      status: "INVESTIGATING",
      autoCreated: true,
      updates: {
        create: {
          message: errorMessage || `Monitor ${monitorName} went ${status}. Investigating...`,
          status: "INVESTIGATING",
        },
      },
    },
  });
}

async function handleMonitorRecovery(
  monitorId: string,
  teamId: string
): Promise<void> {
  const openIncidents = await db.incident.findMany({
    where: {
      monitorId,
      teamId,
      autoCreated: true,
      status: { not: "RESOLVED" },
    },
  });

  for (const incident of openIncidents) {
    await db.incident.update({
      where: { id: incident.id },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        updates: {
          create: {
            message: "Monitor has recovered. Incident automatically resolved.",
            status: "RESOLVED",
          },
        },
      },
    });
  }
}
