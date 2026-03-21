import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encryptJson } from "@/lib/encryption";
import { scheduleMonitor, unscheduleMonitor, rescheduleMonitor } from "@/lib/monitoring/scheduler";

const updateMonitorSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  url: z.string().min(1).optional(),
  type: z.enum(["HTTP", "PING", "PORT", "DNS", "SSL", "KEYWORD"]).optional(),
  method: z.enum(["GET", "POST", "PUT", "DELETE", "HEAD", "PATCH"]).optional(),
  headers: z.record(z.string()).optional().nullable(),
  body: z.string().optional().nullable(),
  expectedStatus: z.number().int().min(100).max(599).optional(),
  expectedContent: z.string().optional().nullable(),
  contentType: z.enum(["keyword", "regex", "jsonpath"]).optional(),
  timeout: z.number().int().min(1000).max(60000).optional(),
  interval: z.number().int().min(10).max(3600).optional(),
  regions: z.array(z.string()).optional(),
  responseTimeThreshold: z.number().int().min(100).max(60000).optional(),
  isActive: z.boolean().optional(),
});

async function getMonitorForUser(monitorId: string, teamId: string) {
  return db.monitor.findFirst({
    where: { id: monitorId, teamId },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  const monitor = await db.monitor.findFirst({
    where: { id: params.id, teamId },
    include: {
      sslHistory: {
        orderBy: { recordedAt: "desc" },
        take: 1,
      },
      _count: {
        select: {
          checkResults: true,
          incidents: { where: { status: { not: "RESOLVED" } } },
        },
      },
    },
  });

  if (!monitor) return NextResponse.json({ error: "Monitor not found" }, { status: 404 });

  return NextResponse.json({ monitor });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  const monitor = await getMonitorForUser(params.id, teamId);
  if (!monitor) return NextResponse.json({ error: "Monitor not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateMonitorSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message },
      { status: 400 }
    );
  }

  const { headers, body: bodyData, ...rest } = parsed.data;

  const updated = await db.monitor.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(headers !== undefined && {
        headers: headers ? encryptJson(headers) : null,
      }),
      ...(bodyData !== undefined && {
        body: bodyData ? encryptJson({ body: bodyData }) : null,
      }),
    },
  });

  // Reschedule if interval or active status changed
  if (parsed.data.interval !== undefined || parsed.data.isActive !== undefined) {
    await rescheduleMonitor(updated);
  }

  return NextResponse.json({ monitor: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  const monitor = await getMonitorForUser(params.id, teamId);
  if (!monitor) return NextResponse.json({ error: "Monitor not found" }, { status: 404 });

  await unscheduleMonitor(params.id);
  await db.monitor.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
