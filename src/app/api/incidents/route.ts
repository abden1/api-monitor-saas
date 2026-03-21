import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const createIncidentSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  status: z.enum(["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"]).default("INVESTIGATING"),
  monitorId: z.string().optional(),
  affectedComponents: z.array(z.string()).default([]),
  message: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ incidents: [] });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");

  const where = {
    teamId,
    ...(status && { status: status as "INVESTIGATING" | "IDENTIFIED" | "MONITORING" | "RESOLVED" }),
  };

  const [incidents, total] = await Promise.all([
    db.incident.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        monitor: { select: { id: true, name: true, url: true } },
        updates: { orderBy: { createdAt: "asc" }, take: 1 },
        _count: { select: { updates: true } },
      },
    }),
    db.incident.count({ where }),
  ]);

  return NextResponse.json({ incidents, total });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  const body = await req.json();
  const parsed = createIncidentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message },
      { status: 400 }
    );
  }

  const { message, ...incidentData } = parsed.data;

  const incident = await db.incident.create({
    data: {
      teamId,
      ...incidentData,
      updates: message
        ? {
            create: {
              message,
              status: incidentData.status,
              createdById: session.user.id,
            },
          }
        : undefined,
    },
    include: { updates: true },
  });

  return NextResponse.json({ incident }, { status: 201 });
}
