import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

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
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
  const offset = parseInt(searchParams.get("offset") || "0");
  const region = searchParams.get("region") || undefined;

  const [checks, total] = await Promise.all([
    db.checkResult.findMany({
      where: { monitorId: params.id, ...(region && { region }) },
      orderBy: { timestamp: "desc" },
      take: limit,
      skip: offset,
    }),
    db.checkResult.count({ where: { monitorId: params.id } }),
  ]);

  return NextResponse.json({ checks, total, limit, offset });
}
