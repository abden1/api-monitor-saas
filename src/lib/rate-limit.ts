import { redis } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";

interface RateLimitConfig {
  windowMs: number;
  max: number;
  keyPrefix?: string;
}

export async function rateLimit(
  req: NextRequest,
  config: RateLimitConfig
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  const prefix = config.keyPrefix || "rl";
  const key = `${prefix}:${ip}`;
  const windowSeconds = Math.floor(config.windowMs / 1000);

  const pipeline = redis.pipeline();
  pipeline.incr(key);
  pipeline.expire(key, windowSeconds);
  const results = await pipeline.exec();

  const count = (results?.[0]?.[1] as number) || 0;
  const remaining = Math.max(0, config.max - count);
  const reset = Date.now() + config.windowMs;

  return {
    success: count <= config.max,
    remaining,
    reset,
  };
}

export function rateLimitResponse() {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    { status: 429 }
  );
}
