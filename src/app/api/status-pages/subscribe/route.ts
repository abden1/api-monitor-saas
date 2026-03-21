import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { nanoid } from "nanoid";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder");

export async function POST(req: NextRequest) {
  try {
    const { statusPageId, email } = await req.json();

    if (!statusPageId || !email) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const statusPage = await db.statusPage.findUnique({
      where: { id: statusPageId },
    });

    if (!statusPage || !statusPage.isPublished) {
      return NextResponse.json({ error: "Status page not found" }, { status: 404 });
    }

    // Check if already subscribed
    const existing = await db.subscriber.findFirst({
      where: { statusPageId, email },
    });

    if (existing) {
      return NextResponse.json({ message: "Already subscribed" });
    }

    const token = nanoid(32);

    await db.subscriber.create({
      data: {
        statusPageId,
        email,
        token,
        verified: false,
      },
    });

    // Send verification email
    const confirmUrl = `${process.env.NEXTAUTH_URL}/api/status-pages/confirm?token=${token}`;

    await resend.emails.send({
      from: process.env.EMAIL_FROM || "noreply@example.com",
      to: email,
      subject: `Confirm subscription to ${statusPage.title}`,
      html: `
        <p>You requested to subscribe to status updates for <strong>${statusPage.title}</strong>.</p>
        <p><a href="${confirmUrl}">Click here to confirm your subscription</a></p>
        <p>If you did not request this, ignore this email.</p>
      `,
    });

    return NextResponse.json({ message: "Confirmation email sent" });
  } catch (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
