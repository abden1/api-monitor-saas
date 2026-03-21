import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateApiKey, hasScope } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const ctx = await validateApiKey(req);
  if (!ctx) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

  const incidents = await db.incident.findMany({
    where: {
      teamId: ctx.teamId,
      ...(status && { status: status as "INVESTIGATING" | "IDENTIFIED" | "MONITORING" | "RESOLVED" }),
    },
    select: {
      id: true, title: true, status: true, autoCreated: true,
      createdAt: true, resolvedAt: true,
      monitor: { select: { id: true, name: true, url: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ incidents });
}

export async function POST(req: NextRequest) {
  const ctx = await validateApiKey(req);
  if (!ctx) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  if (!hasScope(ctx, "write")) return NextResponse.json({ error: "Insufficient scope" }, { status: 403 });

  const body = await req.json();

  if (!body.title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const incident = await db.incident.create({
    data: {
      teamId: ctx.teamId,
      title: body.title,
      description: body.description,
      status: body.status || "INVESTIGATING",
      monitorId: body.monitorId,
    },
  });

  return NextResponse.json({ incident }, { status: 201 });
}
