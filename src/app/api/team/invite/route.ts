import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Resend } from "resend";
import { addDays } from "date-fns";

const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder");

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).default("MEMBER"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as { teamId?: string }).teamId;
  const callerRole = (session.user as { role?: string }).role;

  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });
  if (callerRole !== "OWNER" && callerRole !== "ADMIN") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });

  const team = await db.team.findUnique({ where: { id: teamId } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  // Check if already a member
  const existingUser = await db.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    include: { teamMembers: { where: { teamId } } },
  });

  if (existingUser?.teamMembers.length) {
    return NextResponse.json({ error: "User is already a team member" }, { status: 409 });
  }

  // Create or update invitation
  const invitation = await db.invitation.upsert({
    where: { token: "placeholder" }, // This won't match
    create: {
      teamId,
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      expiresAt: addDays(new Date(), 7),
    },
    update: {},
  });

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitation.token}`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM || "noreply@apimonitor.io",
    to: parsed.data.email,
    subject: `You're invited to join ${team.name} on API Monitor`,
    html: `
      <p>You've been invited to join <strong>${team.name}</strong> on API Monitor.</p>
      <p><a href="${inviteUrl}">Accept Invitation</a></p>
      <p>This invitation expires in 7 days.</p>
    `,
  });

  return NextResponse.json({ invitation: { id: invitation.id, email: invitation.email } }, { status: 201 });
}
