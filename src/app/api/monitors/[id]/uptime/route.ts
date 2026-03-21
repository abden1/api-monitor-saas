import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUptimeStats } from "@/lib/uptime";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  const monitor = await db.monitor.findFirst({
    where: { id: params.id, teamId },
  });
  if (!monitor) return NextResponse.json({ error: "Monitor not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const days = Math.min(parseInt(searchParams.get("days") || "30"), 90);

  const stats = await getUptimeStats(params.id, days);

  return NextResponse.json(stats);
}
