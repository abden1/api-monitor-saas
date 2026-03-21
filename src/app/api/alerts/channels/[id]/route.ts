import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encryptJson, safeDecryptJson } from "@/lib/encryption";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  const channel = await db.alertChannel.findFirst({ where: { id: params.id, teamId } });
  if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.enabled !== undefined) updateData.enabled = body.enabled;
  if (body.config !== undefined) updateData.config = encryptJson(body.config);

  const updated = await db.alertChannel.update({
    where: { id: params.id },
    data: updateData,
  });

  const config = safeDecryptJson<Record<string, unknown>>(updated.config) || {};
  return NextResponse.json({ channel: { ...updated, config } });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  const channel = await db.alertChannel.findFirst({ where: { id: params.id, teamId } });
  if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.alertChannel.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
