import { NextResponse } from "next/server";
import {
  ensureAdminPasswordConfigured,
  isUsingUpstashForLoginRateLimit,
} from "@/lib/admin-auth-security";
import { isUsingUpstashForWriteRateLimit } from "@/lib/admin-write-rate-limit";

export const dynamic = "force-dynamic";

export function GET() {
  const authSecretConfigured = Boolean(
    process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim()
  );
  const adminPasswordConfigured = ensureAdminPasswordConfigured().ok;
  const loginRateLimitBackend = isUsingUpstashForLoginRateLimit()
    ? "upstash"
    : "memory";
  const writeRateLimitBackend = isUsingUpstashForWriteRateLimit()
    ? "upstash"
    : "memory";

  const checks = {
    authSecretConfigured,
    adminPasswordConfigured,
    loginRateLimitBackend,
    writeRateLimitBackend,
  };
  const allHealthy = authSecretConfigured && adminPasswordConfigured;

  return NextResponse.json(
    {
      status: allHealthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      uptimeSec: Math.floor(process.uptime()),
      node: process.version,
      env: process.env.NODE_ENV || "development",
      checks,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
      status: allHealthy ? 200 : 503,
    }
  );
}
