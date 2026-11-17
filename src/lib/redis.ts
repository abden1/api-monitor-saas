import Redis from "ioredis";
import { hasRedis } from "./env";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient() {
  const url = process.env.REDIS_URL || "redis://localhost:6379";

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

function getRedis() {
  if (!globalForRedis.redis) {
    globalForRedis.redis = createRedisClient();
  }
  return globalForRedis.redis;
}

/**
 * Without REDIS_URL (serverless mode) the few keys the app keeps — rate limits and alert
 * cooldowns — live in memory instead of hanging on a connection that never comes.
 */
type Entry = { v: string; exp: number | null };
function memoryRedis() {
  const store = new Map<string, Entry>();
  const live = (k: string) => {
    const e = store.get(k);
    if (!e) return null;
    if (e.exp !== null && e.exp < Date.now()) {
      store.delete(k);
      return null;
    }
    return e;
  };
  const api = {
    async get(k: string) {
      return live(k)?.v ?? null;
    },
    async set(k: string, v: string) {
      store.set(k, { v, exp: null });
      return "OK";
    },
    async setex(k: string, seconds: number, v: string) {
      store.set(k, { v, exp: Date.now() + seconds * 1000 });
      return "OK";
    },
    async del(...keys: string[]) {
      let n = 0;
      for (const k of keys) if (store.delete(k)) n++;
      return n;
    },
    async keys(pattern: string) {
      const re = new RegExp("^" + pattern.split("*").map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$");
      return [...store.keys()].filter((k) => live(k) && re.test(k));
    },
    async incr(k: string) {
      const e = live(k);
      const n = (e ? Number(e.v) : 0) + 1;
      store.set(k, { v: String(n), exp: e?.exp ?? null });
      return n;
    },
    async expire(k: string, seconds: number) {
      const e = live(k);
      if (!e) return 0;
      e.exp = Date.now() + seconds * 1000;
      return 1;
    },
    async publish() {
      return 0;
    },
    pipeline() {
      const ops: Array<() => Promise<unknown>> = [];
      const p = {
        incr(k: string) {
          ops.push(() => api.incr(k));
          return p;
        },
        expire(k: string, seconds: number) {
          ops.push(() => api.expire(k, seconds));
          return p;
        },
        async exec() {
          const out: [null, unknown][] = [];
          for (const op of ops) out.push([null, await op()]);
          return out;
        },
      };
      return p;
    },
  };
  return api;
}

export const redis: Redis = hasRedis
  ? new Proxy({} as Redis, {
      get(_target, prop: string | symbol) {
        return (getRedis() as unknown as Record<string | symbol, unknown>)[prop];
      },
    })
  : (memoryRedis() as unknown as Redis);

export default redis;
