import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateApiKey, hasScope } from "@/lib/api-auth";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const rl = await rateLimit(req, { windowMs: 60000, max: 100, keyPrefix: "v1:monitors" });
  if (!rl.success) return rateLimitResponse();

  const ctx = await validateApiKey(req);
  if (!ctx) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });

  const monitors = await db.monitor.findMany({
    where: { teamId: ctx.teamId },
    select: {
      id: true, name: true, url: true, type: true, status: true,
      interval: true, lastCheckedAt: true, isActive: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ monitors });
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { windowMs: 60000, max: 30, keyPrefix: "v1:monitors:create" });
  if (!rl.success) return rateLimitResponse();

  const ctx = await validateApiKey(req);
  if (!ctx) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  if (!hasScope(ctx, "write")) return NextResponse.json({ error: "Insufficient scope" }, { status: 403 });

  const body = await req.json();

  const monitor = await db.monitor.create({
    data: {
      teamId: ctx.teamId,
      name: body.name,
      url: body.url,
      type: body.type || "HTTP",
      method: body.method || "GET",
      expectedStatus: body.expectedStatus || 200,
      timeout: body.timeout || 30000,
      interval: body.interval || 60,
    },
  });

  return NextResponse.json({ monitor }, { status: 201 });
}
