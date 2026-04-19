import { getRedis } from "@/lib/rate-limit";

const countKeyPrefix = "login-lock";
const fallbackTtlSeconds = 30 * 24 * 60 * 60;

type FallbackEntry = {
  failureCount: number;
  lockUntilMs: number | null;
  expiresAtMs: number;
};

const globalForLoginLockout = globalThis as unknown as {
  loginLockoutFallback?: Map<string, FallbackEntry>;
};

function getFallbackStore() {
  if (!globalForLoginLockout.loginLockoutFallback) {
    globalForLoginLockout.loginLockoutFallback = new Map();
  }

  return globalForLoginLockout.loginLockoutFallback;
}

function cleanupFallbackStore(nowMs: number) {
  const store = getFallbackStore();
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAtMs <= nowMs) {
      store.delete(key);
    }
  }
}

function getCountKey(normalizedLogin: string) {
  return `${countKeyPrefix}:${normalizedLogin}:count`;
}

function getLockKey(normalizedLogin: string) {
  return `${countKeyPrefix}:${normalizedLogin}:lock`;
}

function getFallbackEntry(normalizedLogin: string, nowMs: number) {
  cleanupFallbackStore(nowMs);
  return getFallbackStore().get(normalizedLogin) ?? null;
}

function setFallbackEntry(normalizedLogin: string, entry: FallbackEntry) {
  getFallbackStore().set(normalizedLogin, entry);
}

function clearFallbackEntry(normalizedLogin: string) {
  getFallbackStore().delete(normalizedLogin);
}

function getLockDurationSeconds(failureCount: number) {
  if (failureCount >= 9) {
    return 15 * 60;
  }

  if (failureCount >= 6) {
    return 5 * 60;
  }

  if (failureCount >= 3) {
    return 60;
  }

  return 0;
}

function toRetryAfterSeconds(lockUntilMs: number, nowMs: number) {
  return Math.max(1, Math.ceil((lockUntilMs - nowMs) / 1000));
}

export function normalizeLoginForLookup(login: string) {
  return login.trim();
}

export function normalizeLoginForLockout(login: string) {
  return normalizeLoginForLookup(login).toLowerCase();
}

export async function inspectLoginLockout(normalizedLogin: string) {
  if (!normalizedLogin) {
    return { locked: false, retryAfterSeconds: 0 };
  }

  const nowMs = Date.now();

  try {
    const redis = getRedis();
    const ttl = await redis.ttl(getLockKey(normalizedLogin));
    if (ttl > 0) {
      return { locked: true, retryAfterSeconds: ttl };
    }

    return { locked: false, retryAfterSeconds: 0 };
  } catch {
    const fallbackEntry = getFallbackEntry(normalizedLogin, nowMs);
    if (!fallbackEntry || !fallbackEntry.lockUntilMs || fallbackEntry.lockUntilMs <= nowMs) {
      return { locked: false, retryAfterSeconds: 0 };
    }

    return {
      locked: true,
      retryAfterSeconds: toRetryAfterSeconds(fallbackEntry.lockUntilMs, nowMs),
    };
  }
}

export async function recordLoginFailure(normalizedLogin: string) {
  if (!normalizedLogin) {
    return { failureCount: 0, retryAfterSeconds: 0 };
  }

  const nowMs = Date.now();

  try {
    const redis = getRedis();
    const failureCount = await redis.incr(getCountKey(normalizedLogin));
    await redis.expire(getCountKey(normalizedLogin), fallbackTtlSeconds);

    const retryAfterSeconds = getLockDurationSeconds(failureCount);
    if (retryAfterSeconds > 0) {
      await redis.set(getLockKey(normalizedLogin), "1", "EX", retryAfterSeconds);
    }

    clearFallbackEntry(normalizedLogin);

    return {
      failureCount,
      retryAfterSeconds,
    };
  } catch {
    const existing = getFallbackEntry(normalizedLogin, nowMs);
    const failureCount = (existing?.failureCount ?? 0) + 1;
    const retryAfterSeconds = getLockDurationSeconds(failureCount);
    const lockUntilMs = retryAfterSeconds > 0 ? nowMs + retryAfterSeconds * 1000 : null;

    setFallbackEntry(normalizedLogin, {
      failureCount,
      lockUntilMs,
      expiresAtMs: nowMs + fallbackTtlSeconds * 1000,
    });

    return {
      failureCount,
      retryAfterSeconds,
    };
  }
}

export async function clearLoginFailures(normalizedLogin: string) {
  if (!normalizedLogin) {
    return;
  }

  clearFallbackEntry(normalizedLogin);

  try {
    const redis = getRedis();
    await redis.del(getCountKey(normalizedLogin), getLockKey(normalizedLogin));
  } catch {
    // Best-effort clear only. In local fallback mode the in-memory state is already reset.
  }
}
