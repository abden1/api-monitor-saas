import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createCheckoutSession } from "@/lib/billing/stripe";
import type { Plan } from "@prisma/client";

const checkoutSchema = z.object({
  plan: z.enum(["STARTER", "PRO", "ENTERPRISE"]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  const body = await req.json();
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const team = await db.team.findUnique({ where: { id: teamId } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = await createCheckoutSession(
    teamId,
    parsed.data.plan as Plan,
    session.user.email!,
    team.name,
    `${appUrl}/settings/billing?success=true`,
    `${appUrl}/settings/billing?canceled=true`
  );

  return NextResponse.json({ url });
}
