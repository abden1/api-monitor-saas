import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateApiKey } from "@/lib/api-auth";
import { getUptimeStats } from "@/lib/uptime";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await validateApiKey(req);
  if (!ctx) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });

  const monitor = await db.monitor.findFirst({
    where: { id: params.id, teamId: ctx.teamId },
  });
  if (!monitor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") || "30");

  const stats = await getUptimeStats(params.id, days);

  return NextResponse.json(stats);
}
