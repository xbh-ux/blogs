import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptimeSec: Math.floor(process.uptime()),
      node: process.version,
      env: process.env.NODE_ENV || "development",
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
