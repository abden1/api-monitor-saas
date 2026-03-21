import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { scheduleMonitor, unscheduleMonitor } from "@/lib/monitoring/scheduler";

export async function POST(
  _req: NextRequest,
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

  const newActive = !monitor.isActive;

  const updated = await db.monitor.update({
    where: { id: params.id },
    data: {
      isActive: newActive,
      status: newActive ? "PENDING" : "PAUSED",
    },
  });

  if (newActive) {
    await scheduleMonitor(updated);
  } else {
    await unscheduleMonitor(params.id);
  }

  return NextResponse.json({ monitor: updated });
}
