import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encryptJson } from "@/lib/encryption";
import { scheduleMonitor } from "@/lib/monitoring/scheduler";
import { canAddMonitor, getMinCheckInterval } from "@/lib/billing/plans";

const createMonitorSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().min(1),
  type: z.enum(["HTTP", "PING", "PORT", "DNS", "SSL", "KEYWORD"]).default("HTTP"),
  method: z.enum(["GET", "POST", "PUT", "DELETE", "HEAD", "PATCH"]).default("GET"),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  expectedStatus: z.number().int().min(100).max(599).default(200),
  expectedContent: z.string().optional(),
  contentType: z.enum(["keyword", "regex", "jsonpath"]).default("keyword"),
  timeout: z.number().int().min(1000).max(60000).default(30000),
  interval: z.number().int().min(10).max(3600).default(60),
  regions: z.array(z.string()).default(["us-east"]),
  responseTimeThreshold: z.number().int().min(100).max(60000).default(5000),
  sslExpiryAlertDays: z.array(z.number()).default([7, 14, 30]),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ monitors: [] });

  const monitors = await db.monitor.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { incidents: { where: { status: { not: "RESOLVED" } } } } },
    },
  });

  return NextResponse.json({ monitors });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ error: "No team found" }, { status: 400 });

  const body = await req.json();
  const parsed = createMonitorSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const team = await db.team.findUnique({ where: { id: teamId } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  // Check plan limits
  const currentCount = await db.monitor.count({ where: { teamId } });
  if (!canAddMonitor(team.plan, currentCount)) {
    return NextResponse.json(
      { error: `Your plan allows up to ${currentCount} monitors. Upgrade to add more.` },
      { status: 403 }
    );
  }

  const { headers, body: bodyData, interval, ...rest } = parsed.data;

  // Enforce minimum check interval for plan
  const minInterval = getMinCheckInterval(team.plan);
  const finalInterval = Math.max(interval, minInterval);

  const monitor = await db.monitor.create({
    data: {
      teamId,
      ...rest,
      interval: finalInterval,
      headers: headers ? encryptJson(headers) : null,
      body: bodyData ? encryptJson({ body: bodyData }) : null,
    },
  });

  // Schedule the monitor
  await scheduleMonitor(monitor);

  return NextResponse.json({ monitor }, { status: 201 });
}
