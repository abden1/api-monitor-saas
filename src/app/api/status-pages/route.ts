import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAddStatusPage } from "@/lib/billing/plans";
import { nanoid } from "nanoid";

const createStatusPageSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/).optional(),
  customDomain: z.string().optional(),
  brandColor: z.string().default("#6366f1"),
  template: z.enum(["LIGHT", "DARK", "MINIMAL", "DETAILED"]).default("LIGHT"),
  logoUrl: z.string().url().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ statusPages: [] });

  const statusPages = await db.statusPage.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { components: true, subscribers: true } },
    },
  });

  return NextResponse.json({ statusPages });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  const team = await db.team.findUnique({ where: { id: teamId } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const currentCount = await db.statusPage.count({ where: { teamId } });
  if (!canAddStatusPage(team.plan, currentCount)) {
    return NextResponse.json(
      { error: "Status page limit reached for your plan. Please upgrade." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = createStatusPageSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
  }

  const slug = parsed.data.slug || `${team.slug}-${nanoid(8)}`;

  const existing = await db.statusPage.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
  }

  const statusPage = await db.statusPage.create({
    data: { teamId, ...parsed.data, slug },
  });

  return NextResponse.json({ statusPage }, { status: 201 });
}
