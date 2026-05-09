import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { getClientKey } from "./admin-auth-security";

const DEFAULT_WRITE_WINDOW_MINUTES = 10;
const DEFAULT_WRITE_MAX_REQUESTS = 60;
const RATE_LIMIT_PREFIX = "blogs-next:admin-write";

type CounterWindow = {
  count: number;
  startedAt: number;
};

const memoryCounters = new Map<string, CounterWindow>();

function parseIntegerEnv(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const writeWindowMinutes = parseIntegerEnv(
  process.env.ADMIN_WRITE_WINDOW_MINUTES,
  DEFAULT_WRITE_WINDOW_MINUTES
);
const writeMaxRequests = parseIntegerEnv(
  process.env.ADMIN_WRITE_MAX_REQUESTS,
  DEFAULT_WRITE_MAX_REQUESTS
);

export const ADMIN_WRITE_WINDOW_MS = writeWindowMinutes * 60 * 1000;
export const ADMIN_WRITE_MAX_REQUESTS = writeMaxRequests;

const upstashWriteRatelimit =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(
          ADMIN_WRITE_MAX_REQUESTS,
          `${writeWindowMinutes} m`
        ),
        prefix: RATE_LIMIT_PREFIX,
        analytics: false,
      })
    : null;

function pruneMemoryCounters(now: number) {
  for (const [key, value] of memoryCounters) {
    if (now - value.startedAt >= ADMIN_WRITE_WINDOW_MS) {
      memoryCounters.delete(key);
    }
  }
}

function checkMemoryLimit(identifier: string) {
  const now = Date.now();
  pruneMemoryCounters(now);

  const state = memoryCounters.get(identifier);
  if (!state || now - state.startedAt >= ADMIN_WRITE_WINDOW_MS) {
    memoryCounters.set(identifier, { count: 1, startedAt: now });
    return { success: true, remaining: ADMIN_WRITE_MAX_REQUESTS - 1 };
  }

  if (state.count >= ADMIN_WRITE_MAX_REQUESTS) {
    return { success: false, remaining: 0 };
  }

  state.count += 1;
  return { success: true, remaining: ADMIN_WRITE_MAX_REQUESTS - state.count };
}

export async function enforceAdminWriteRateLimit(
  request: Request,
  scope: "create" | "update" | "delete"
) {
  const identifier = `${scope}:${getClientKey(request)}`;

  if (!upstashWriteRatelimit) {
    const result = checkMemoryLimit(identifier);
    if (result.success) {
      return null;
    }
    return Response.json(
      { error: "写操作过于频繁，请稍后重试" },
      { status: 429 }
    );
  }

  try {
    const result = await upstashWriteRatelimit.limit(identifier);
    if (result.success) {
      return null;
    }
    return Response.json(
      { error: "写操作过于频繁，请稍后重试" },
      { status: 429 }
    );
  } catch (error) {
    console.warn(
      "Admin write rate limit check failed, fallback to memory counter.",
      error
    );
    const fallback = checkMemoryLimit(identifier);
    if (fallback.success) {
      return null;
    }
    return Response.json(
      { error: "写操作过于频繁，请稍后重试" },
      { status: 429 }
    );
  }
}

export function isUsingUpstashForWriteRateLimit() {
  return Boolean(upstashWriteRatelimit);
}
