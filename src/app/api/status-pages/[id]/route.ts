import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const updateStatusPageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  customDomain: z.string().optional().nullable(),
  brandColor: z.string().optional(),
  template: z.enum(["LIGHT", "DARK", "MINIMAL", "DETAILED"]).optional(),
  logoUrl: z.string().url().optional().nullable(),
  isPublished: z.boolean().optional(),
  showUptime: z.boolean().optional(),
  showResponseTime: z.boolean().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  components: z.array(z.object({
    id: z.string().optional(),
    monitorId: z.string().optional().nullable(),
    name: z.string().min(1),
    description: z.string().optional(),
    groupName: z.string().optional(),
    displayOrder: z.number().int().default(0),
    showUptime: z.boolean().default(true),
  })).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  const page = await db.statusPage.findFirst({
    where: { id: params.id, teamId },
    include: {
      components: {
        orderBy: [{ groupName: "asc" }, { displayOrder: "asc" }],
        include: {
          monitor: {
            select: {
              id: true, name: true, url: true, status: true,
              lastCheckedAt: true,
            },
          },
        },
      },
      _count: { select: { subscribers: true } },
    },
  });

  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ statusPage: page });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  const page = await db.statusPage.findFirst({ where: { id: params.id, teamId } });
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateStatusPageSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
  }

  const { components, ...pageData } = parsed.data;

  const updated = await db.statusPage.update({
    where: { id: params.id },
    data: pageData,
  });

  // Update components if provided
  if (components !== undefined) {
    // Delete all existing, recreate
    await db.statusPageComponent.deleteMany({ where: { statusPageId: params.id } });
    if (components.length > 0) {
      await db.statusPageComponent.createMany({
        data: components.map((c, i) => ({
          statusPageId: params.id,
          monitorId: c.monitorId || null,
          name: c.name,
          description: c.description,
          groupName: c.groupName,
          displayOrder: c.displayOrder ?? i,
          showUptime: c.showUptime ?? true,
        })),
      });
    }
  }

  return NextResponse.json({ statusPage: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  const page = await db.statusPage.findFirst({ where: { id: params.id, teamId } });
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.statusPage.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
