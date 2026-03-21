import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.enum(["read", "write", "admin"])).default(["read"]),
  expiresAt: z.string().datetime().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ keys: [] });

  const keys = await db.apiKey.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, keyPrefix: true, scopes: true,
      lastUsedAt: true, expiresAt: true, createdAt: true,
    },
  });

  return NextResponse.json({ keys });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  const role = (session.user as { role?: string }).role;

  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });
  if (role !== "OWNER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createKeySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });

  const rawKey = `am_${nanoid(32)}`;
  const keyHash = await bcrypt.hash(rawKey, 10);
  const keyPrefix = rawKey.slice(0, 8);

  const key = await db.apiKey.create({
    data: {
      teamId,
      name: parsed.data.name,
      keyHash,
      keyPrefix,
      scopes: parsed.data.scopes,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    },
  });

  // Return plain key ONCE
  return NextResponse.json(
    { key: { ...key, plainKey: rawKey } },
    { status: 201 }
  );
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const keyId = searchParams.get("id");

  const key = await db.apiKey.findFirst({ where: { id: keyId!, teamId } });
  if (!key) return NextResponse.json({ error: "API key not found" }, { status: 404 });

  await db.apiKey.delete({ where: { id: keyId! } });

  return NextResponse.json({ success: true });
}
