import Redis from "ioredis";
import { getEnv } from "@/lib/env";

const globalForRedis = globalThis as unknown as {
  redis?: Redis;
};

export function getRedis() {
  if (!globalForRedis.redis) {
    globalForRedis.redis = new Redis(getEnv().REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
  }

  return globalForRedis.redis;
}

export async function enforceFixedWindowLimit(options: {
  key: string;
  limit: number;
  windowSeconds: number;
}) {
  const redis = getRedis();
  const count = await redis.incr(options.key);

  if (count === 1) {
    await redis.expire(options.key, options.windowSeconds);
  }

  if (count > options.limit) {
    throw new Response("Rate limit exceeded", { status: 429 });
  }
}
