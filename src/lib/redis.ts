import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient() {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL environment variable is not set");
  }

  const client = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    tls: url.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
  });

  client.on("error", (err) => {
    if (process.env.NODE_ENV !== "test") {
      console.error("[Redis] Error:", err.message);
    }
  });

  return client;
}

export const redis =
  globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

export default redis;
