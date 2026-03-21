import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import Redis from "ioredis";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) {
    return new Response("No team", { status: 400 });
  }

  const encoder = new TextEncoder();
  let subscriber: Redis | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const url = process.env.REDIS_URL!;
      subscriber = new Redis(url, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true,
        tls: url.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
      });

      const channel = `team:${teamId}:events`;

      subscriber.subscribe(channel, (err) => {
        if (err) {
          console.error("[SSE] Subscribe error:", err);
          controller.close();
          return;
        }
      });

      subscriber.on("message", (_ch: string, message: string) => {
        const data = `data: ${message}\n\n`;
        controller.enqueue(encoder.encode(data));
      });

      // Send initial ping
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`));

      // Keep alive every 30s
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(keepAlive);
        }
      }, 30000);

      req.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        subscriber?.unsubscribe(channel);
        subscriber?.disconnect();
        subscriber = null;
        controller.close();
      });
    },
    cancel() {
      subscriber?.disconnect();
      subscriber = null;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
