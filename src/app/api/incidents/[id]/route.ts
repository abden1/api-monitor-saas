import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const updateIncidentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  status: z.enum(["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"]).optional(),
  postMortem: z.string().optional(),
  affectedComponents: z.array(z.string()).optional(),
  message: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  const incident = await db.incident.findFirst({
    where: { id: params.id, teamId },
    include: {
      monitor: { select: { id: true, name: true, url: true } },
      updates: {
        orderBy: { createdAt: "asc" },
        include: { createdBy: { select: { id: true, name: true, image: true } } },
      },
    },
  });

  if (!incident) return NextResponse.json({ error: "Incident not found" }, { status: 404 });

  return NextResponse.json({ incident });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  const incident = await db.incident.findFirst({
    where: { id: params.id, teamId },
  });
  if (!incident) return NextResponse.json({ error: "Incident not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateIncidentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message },
      { status: 400 }
    );
  }

  const { message, ...updateData } = parsed.data;
  const isResolving = updateData.status === "RESOLVED" && incident.status !== "RESOLVED";

  const updated = await db.incident.update({
    where: { id: params.id },
    data: {
      ...updateData,
      ...(isResolving && { resolvedAt: new Date() }),
      ...(message && {
        updates: {
          create: {
            message,
            status: updateData.status || incident.status,
            createdById: session.user.id,
          },
        },
      }),
    },
    include: {
      updates: { orderBy: { createdAt: "asc" } },
    },
  });

  return NextResponse.json({ incident: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  const incident = await db.incident.findFirst({ where: { id: params.id, teamId } });
  if (!incident) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.incident.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
