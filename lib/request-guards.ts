const DEFAULT_ADMIN_API_BODY_LIMIT_BYTES = 1024 * 1024;

function parseIntegerEnv(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const ADMIN_API_BODY_LIMIT_BYTES = parseIntegerEnv(
  process.env.ADMIN_API_MAX_BODY_BYTES,
  DEFAULT_ADMIN_API_BODY_LIMIT_BYTES
);

type JsonParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

export async function readJsonBodyWithLimit<T = unknown>(
  request: Request,
  maxBytes = ADMIN_API_BODY_LIMIT_BYTES
): Promise<JsonParseResult<T>> {
  let rawBody = "";
  try {
    rawBody = await request.text();
  } catch {
    return { ok: false, status: 400, error: "请求体读取失败" };
  }

  const bytes = new TextEncoder().encode(rawBody).byteLength;
  if (bytes > maxBytes) {
    return {
      ok: false,
      status: 413,
      error: `请求体过大（上限 ${maxBytes} bytes）`,
    };
  }

  if (!rawBody.trim()) {
    return { ok: false, status: 400, error: "请求 JSON 无效" };
  }

  try {
    return { ok: true, data: JSON.parse(rawBody) as T };
  } catch {
    return { ok: false, status: 400, error: "请求 JSON 无效" };
  }
}
