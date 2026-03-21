import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const subscriber = await db.subscriber.findFirst({ where: { token } });

  if (!subscriber) {
    return new NextResponse("Invalid or expired confirmation link.", { status: 400 });
  }

  await db.subscriber.update({
    where: { id: subscriber.id },
    data: { verified: true },
  });

  const statusPage = await db.statusPage.findUnique({
    where: { id: subscriber.statusPageId },
  });

  redirect(`/status/${statusPage?.slug ?? ""}?subscribed=1`);
}
