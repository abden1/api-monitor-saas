import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encryptJson, decryptJson, safeDecryptJson } from "@/lib/encryption";

const createChannelSchema = z.object({
  type: z.enum(["EMAIL", "SMS", "SLACK", "DISCORD", "PAGERDUTY", "OPSGENIE", "WEBHOOK"]),
  name: z.string().min(1).max(200),
  config: z.record(z.unknown()),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ channels: [] });

  const channels = await db.alertChannel.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
  });

  // Mask sensitive config values
  const safeChannels = channels.map((ch) => {
    const config = safeDecryptJson<Record<string, unknown>>(ch.config) || {};
    const maskedConfig = maskSensitiveConfig(ch.type, config);
    return { ...ch, config: maskedConfig };
  });

  return NextResponse.json({ channels: safeChannels });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  const body = await req.json();
  const parsed = createChannelSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
  }

  const channel = await db.alertChannel.create({
    data: {
      teamId,
      type: parsed.data.type,
      name: parsed.data.name,
      config: encryptJson(parsed.data.config),
    },
  });

  const config = safeDecryptJson<Record<string, unknown>>(channel.config) || {};
  return NextResponse.json({ channel: { ...channel, config: maskSensitiveConfig(channel.type, config) } }, { status: 201 });
}

function maskSensitiveConfig(type: string, config: Record<string, unknown>): Record<string, unknown> {
  const masked = { ...config };
  const sensitiveKeys = ["apiKey", "authToken", "integrationKey", "secret", "password"];
  for (const key of sensitiveKeys) {
    if (key in masked && typeof masked[key] === "string") {
      masked[key] = (masked[key] as string).slice(0, 4) + "****";
    }
  }
  return masked;
}
