import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decryptJson } from "@/lib/encryption";
import { sendEmailAlert } from "@/lib/alerts/email";
import { sendSlackAlert } from "@/lib/alerts/slack";
import { sendDiscordAlert } from "@/lib/alerts/discord";
import { sendWebhookAlert } from "@/lib/alerts/webhook";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  const { channelId } = await req.json();

  const channel = await db.alertChannel.findFirst({
    where: { id: channelId, teamId },
  });
  if (!channel) return NextResponse.json({ error: "Channel not found" }, { status: 404 });

  const config = decryptJson<Record<string, unknown>>(channel.config);
  const testData = {
    monitorName: "Test Monitor",
    monitorUrl: "https://example.com",
    status: "DOWN",
    trigger: "DOWN",
    responseTime: 5000,
    errorMessage: "This is a test alert",
    monitorId: "test-id",
    dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    timestamp: new Date(),
  };

  try {
    switch (channel.type) {
      case "EMAIL":
        await sendEmailAlert(config as { to: string | string[] }, testData);
        break;
      case "SLACK":
        await sendSlackAlert(config as { webhookUrl: string }, testData);
        break;
      case "DISCORD":
        await sendDiscordAlert(config as { webhookUrl: string }, testData);
        break;
      case "WEBHOOK":
        await sendWebhookAlert(config as { url: string }, testData);
        break;
      default:
        return NextResponse.json({ error: "Test not supported for this channel type" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Test alert sent successfully" });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send test alert" },
      { status: 500 }
    );
  }
}
