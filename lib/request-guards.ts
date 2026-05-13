const DEFAULT_ADMIN_API_BODY_LIMIT_BYTES = 1024 * 1024;
const JSON_CONTENT_TYPE_RE =
  /^\s*application\/(?:[a-z0-9.+-]+\+)?json(?:\s*;|$)/i;

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

type RequestGuardResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

function getOrigin(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function isJsonContentType(value: string | null | undefined) {
  return Boolean(value && JSON_CONTENT_TYPE_RE.test(value));
}

export function enforceSameOrigin(request: Request): RequestGuardResult {
  const expectedOrigin = getOrigin(request.url);
  if (!expectedOrigin) {
    return { ok: false, status: 400, error: "无法验证请求来源" };
  }

  const originHeader = request.headers.get("origin");
  if (originHeader) {
    return getOrigin(originHeader) === expectedOrigin
      ? { ok: true }
      : { ok: false, status: 403, error: "请求来源不受信任" };
  }

  const refererHeader = request.headers.get("referer");
  if (refererHeader) {
    return getOrigin(refererHeader) === expectedOrigin
      ? { ok: true }
      : { ok: false, status: 403, error: "请求来源不受信任" };
  }

  const secFetchSite = request.headers
    .get("sec-fetch-site")
    ?.trim()
    .toLowerCase();
  if (secFetchSite === "same-origin") {
    return { ok: true };
  }

  if (secFetchSite) {
    return { ok: false, status: 403, error: "请求来源不受信任" };
  }

  return { ok: false, status: 403, error: "缺少来源校验信息" };
}

export async function readJsonBodyWithLimit<T = unknown>(
  request: Request,
  maxBytes = ADMIN_API_BODY_LIMIT_BYTES
): Promise<JsonParseResult<T>> {
  if (!isJsonContentType(request.headers.get("content-type"))) {
    return {
      ok: false,
      status: 415,
      error: "请求 Content-Type 必须为 application/json",
    };
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const declaredBytes = Number.parseInt(contentLength, 10);
    if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
      return {
        ok: false,
        status: 413,
        error: `请求体过大（上限 ${maxBytes} bytes）`,
      };
    }
  }

  const stream = request.body;
  if (!stream) {
    return { ok: false, status: 400, error: "请求 JSON 无效" };
  }

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let rawBody = "";
  let bytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      if (!value) {
        continue;
      }

      bytes += value.byteLength;
      if (bytes > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          // ignore reader cancellation errors after limit exceeded
        }

        return {
          ok: false,
          status: 413,
          error: `请求体过大（上限 ${maxBytes} bytes）`,
        };
      }

      rawBody += decoder.decode(value, { stream: true });
    }

    rawBody += decoder.decode();
  } catch {
    return { ok: false, status: 400, error: "请求体读取失败" };
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
