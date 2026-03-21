import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const createRuleSchema = z.object({
  monitorId: z.string(),
  channelId: z.string(),
  trigger: z.enum(["DOWN", "RECOVERY", "DEGRADED", "SSL_EXPIRY_7", "SSL_EXPIRY_14", "SSL_EXPIRY_30", "RESPONSE_TIME"]),
  enabled: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ rules: [] });

  const { searchParams } = new URL(req.url);
  const monitorId = searchParams.get("monitorId");

  const rules = await db.alertRule.findMany({
    where: {
      monitor: { teamId },
      ...(monitorId && { monitorId }),
    },
    include: {
      channel: { select: { id: true, name: true, type: true } },
      monitor: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ rules });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  const body = await req.json();
  const parsed = createRuleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
  }

  // Verify monitor and channel belong to team
  const [monitor, channel] = await Promise.all([
    db.monitor.findFirst({ where: { id: parsed.data.monitorId, teamId } }),
    db.alertChannel.findFirst({ where: { id: parsed.data.channelId, teamId } }),
  ]);

  if (!monitor) return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
  if (!channel) return NextResponse.json({ error: "Channel not found" }, { status: 404 });

  const rule = await db.alertRule.upsert({
    where: {
      monitorId_channelId_trigger: {
        monitorId: parsed.data.monitorId,
        channelId: parsed.data.channelId,
        trigger: parsed.data.trigger,
      },
    },
    create: parsed.data,
    update: { enabled: parsed.data.enabled },
  });

  return NextResponse.json({ rule }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const ruleId = searchParams.get("id");
  if (!ruleId) return NextResponse.json({ error: "Missing rule ID" }, { status: 400 });

  const rule = await db.alertRule.findFirst({
    where: { id: ruleId, monitor: { teamId } },
  });
  if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.alertRule.delete({ where: { id: ruleId } });

  return NextResponse.json({ success: true });
}
