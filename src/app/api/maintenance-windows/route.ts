import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const createWindowSchema = z.object({
  name: z.string().min(1).max(200),
  monitorIds: z.array(z.string()),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  reason: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ windows: [] });

  const windows = await db.maintenanceWindow.findMany({
    where: { teamId },
    orderBy: { startAt: "desc" },
  });

  return NextResponse.json({ windows });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  const body = await req.json();
  const parsed = createWindowSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });

  const window = await db.maintenanceWindow.create({
    data: {
      teamId,
      name: parsed.data.name,
      monitorIds: parsed.data.monitorIds,
      startAt: new Date(parsed.data.startAt),
      endAt: new Date(parsed.data.endAt),
      reason: parsed.data.reason,
    },
  });

  return NextResponse.json({ window }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  const win = await db.maintenanceWindow.findFirst({ where: { id: id!, teamId } });
  if (!win) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.maintenanceWindow.delete({ where: { id: id! } });

  return NextResponse.json({ success: true });
}
