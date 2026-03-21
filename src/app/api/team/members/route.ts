import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ members: [] });

  const members = await db.teamMember.findMany({
    where: { teamId },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ members });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  const { memberId, role } = await req.json();

  const callerRole = (session.user as { role?: string }).role;
  if (callerRole !== "OWNER" && callerRole !== "ADMIN") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const member = await db.teamMember.findFirst({ where: { id: memberId, teamId } });
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  if (member.role === "OWNER") {
    return NextResponse.json({ error: "Cannot change owner role" }, { status: 400 });
  }

  const updated = await db.teamMember.update({
    where: { id: memberId },
    data: { role },
  });

  return NextResponse.json({ member: updated });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("id");

  const member = await db.teamMember.findFirst({ where: { id: memberId!, teamId } });
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  if (member.role === "OWNER") {
    return NextResponse.json({ error: "Cannot remove the team owner" }, { status: 400 });
  }

  await db.teamMember.delete({ where: { id: memberId! } });

  return NextResponse.json({ success: true });
}
