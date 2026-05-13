import { createHash, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const DEFAULT_LOGIN_WINDOW_MINUTES = 15;
const DEFAULT_MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_PREFIX = "blogs-next:admin-login";

type LoginAttempt = {
  count: number;
  firstAttemptAt: number;
};

const failedLoginAttempts = new Map<string, LoginAttempt>();

function parseIntegerEnv(value: string | undefined, fallback: number) {
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const loginWindowMinutes = parseIntegerEnv(
  process.env.ADMIN_LOGIN_WINDOW_MINUTES,
  DEFAULT_LOGIN_WINDOW_MINUTES
);
const maxLoginAttempts = parseIntegerEnv(
  process.env.ADMIN_LOGIN_MAX_ATTEMPTS,
  DEFAULT_MAX_LOGIN_ATTEMPTS
);

export const LOGIN_WINDOW_MS = loginWindowMinutes * 60 * 1000;
export const MAX_LOGIN_ATTEMPTS = maxLoginAttempts;

const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH?.trim() ?? "";
const legacyAdminPassword = process.env.ADMIN_PASSWORD?.trim() ?? "";
const trustProxyHeaders = process.env.TRUST_PROXY_HEADERS === "true";

let warnedLegacyPassword = false;
let warnedMissingPassword = false;

const upstashRatelimit =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(
          MAX_LOGIN_ATTEMPTS,
          `${loginWindowMinutes} m`
        ),
        prefix: RATE_LIMIT_PREFIX,
        analytics: false,
      })
    : null;

function normalizeIpToken(value: string | null | undefined) {
  const token = value?.trim();
  if (!token) return null;
  if (token.length > 128) return null;
  return token;
}

function normalizeHeaderToken(
  value: string | null | undefined,
  maxLength = 256
) {
  const token = value?.trim();
  if (!token) return null;
  return token.length > maxLength ? token.slice(0, maxLength) : token;
}

function getForwardedIp(request?: Request) {
  const forwardedFor = request?.headers
    .get("x-forwarded-for")
    ?.split(",")[0];
  return normalizeIpToken(forwardedFor);
}

function getRequestFingerprint(request?: Request) {
  const userAgent = normalizeHeaderToken(request?.headers.get("user-agent"), 512);
  const acceptLanguage = normalizeHeaderToken(
    request?.headers.get("accept-language"),
    256
  );
  const secFetchSite = normalizeHeaderToken(
    request?.headers.get("sec-fetch-site"),
    64
  );

  if (!userAgent && !acceptLanguage && !secFetchSite) {
    return "local";
  }

  const fingerprint = [
    userAgent ?? "unknown-agent",
    acceptLanguage ?? "unknown-language",
    secFetchSite ?? "unknown-site",
  ].join("|");

  return `fingerprint:${createHash("sha256")
    .update(fingerprint)
    .digest("hex")
    .slice(0, 24)}`;
}

export function getClientKey(request?: Request) {
  const realIp = normalizeIpToken(request?.headers.get("x-real-ip"));
  const cfIp = normalizeIpToken(request?.headers.get("cf-connecting-ip"));
  const forwardedIp = getForwardedIp(request);

  if (trustProxyHeaders) {
    return forwardedIp || cfIp || realIp || getRequestFingerprint(request);
  }

  return getRequestFingerprint(request);
}

function pruneFailedLogins(now: number) {
  for (const [key, attempt] of failedLoginAttempts) {
    if (now - attempt.firstAttemptAt >= LOGIN_WINDOW_MS) {
      failedLoginAttempts.delete(key);
    }
  }
}

function isMemoryRateLimited(key: string) {
  const now = Date.now();
  pruneFailedLogins(now);
  const attempt = failedLoginAttempts.get(key);
  return Boolean(attempt && attempt.count >= MAX_LOGIN_ATTEMPTS);
}

function recordFailedLoginMemory(key: string) {
  const now = Date.now();
  const attempt = failedLoginAttempts.get(key);

  if (!attempt || now - attempt.firstAttemptAt >= LOGIN_WINDOW_MS) {
    failedLoginAttempts.set(key, { count: 1, firstAttemptAt: now });
    return;
  }

  attempt.count += 1;
}

function clearFailedLoginMemory(key: string) {
  failedLoginAttempts.delete(key);
}

export async function isRateLimited(key: string) {
  if (!upstashRatelimit) {
    return isMemoryRateLimited(key);
  }

  try {
    const remaining = await upstashRatelimit.getRemaining(key);
    return remaining.remaining <= 0 && remaining.reset > Date.now();
  } catch (error) {
    console.warn(
      "Upstash rate limit check failed, falling back to in-memory limiter.",
      error
    );
    return isMemoryRateLimited(key);
  }
}

export async function recordFailedLogin(key: string) {
  if (!upstashRatelimit) {
    recordFailedLoginMemory(key);
    return;
  }

  try {
    await upstashRatelimit.limit(key);
  } catch (error) {
    console.warn(
      "Upstash rate limit update failed, falling back to in-memory limiter.",
      error
    );
    recordFailedLoginMemory(key);
  }
}

export async function clearFailedLogins(key: string) {
  clearFailedLoginMemory(key);

  if (!upstashRatelimit) {
    return;
  }

  try {
    await upstashRatelimit.resetUsedTokens(key);
  } catch (error) {
    console.warn("Failed to reset Upstash rate limit counter.", error);
  }
}

function safeCompare(value: string, expected: string) {
  const valueHash = createHash("sha256").update(value).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(valueHash, expectedHash);
}

function isBcryptHash(value: string) {
  return /^\$2[aby]\$\d{2}\$/.test(value);
}

export function ensureAdminPasswordConfigured() {
  if (adminPasswordHash) {
    if (!isBcryptHash(adminPasswordHash)) {
      return {
        ok: false,
        reason:
          "ADMIN_PASSWORD_HASH 已配置，但格式不是 bcrypt 哈希（应以 $2a/$2b/$2y 开头）。",
      };
    }

    return { ok: true };
  }

  if (legacyAdminPassword) {
    if (!warnedLegacyPassword) {
      warnedLegacyPassword = true;
      console.warn(
        "Using legacy ADMIN_PASSWORD. Please migrate to ADMIN_PASSWORD_HASH."
      );
    }

    return { ok: true };
  }

  if (!warnedMissingPassword) {
    warnedMissingPassword = true;
    console.error(
      "Neither ADMIN_PASSWORD_HASH nor ADMIN_PASSWORD is configured."
    );
  }

  return {
    ok: false,
    reason: "未配置管理员密码（ADMIN_PASSWORD_HASH 或 ADMIN_PASSWORD）。",
  };
}

export async function verifyAdminPassword(inputPassword: string) {
  if (adminPasswordHash) {
    return bcrypt.compare(inputPassword, adminPasswordHash);
  }

  if (legacyAdminPassword) {
    return safeCompare(inputPassword, legacyAdminPassword);
  }

  return false;
}

export function isUsingUpstashForLoginRateLimit() {
  return Boolean(upstashRatelimit);
}
