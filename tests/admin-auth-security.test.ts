import { afterEach, describe, expect, it, vi } from "vitest";

const originalTrustProxyHeaders = process.env.TRUST_PROXY_HEADERS;

afterEach(() => {
  if (originalTrustProxyHeaders === undefined) {
    delete process.env.TRUST_PROXY_HEADERS;
  } else {
    process.env.TRUST_PROXY_HEADERS = originalTrustProxyHeaders;
  }

  vi.resetModules();
});

describe("getClientKey", () => {
  it("does not trust proxy ip headers unless explicitly enabled", async () => {
    delete process.env.TRUST_PROXY_HEADERS;
    vi.resetModules();

    const { getClientKey } = await import("@/lib/admin-auth-security");
    const request = new Request("http://localhost/login", {
      headers: {
        "x-forwarded-for": "1.2.3.4",
        "x-real-ip": "5.6.7.8",
        "cf-connecting-ip": "9.9.9.9",
        "user-agent": "Vitest",
        "accept-language": "zh-CN",
      },
    });

    const key = getClientKey(request);
    expect(key).toMatch(/^fingerprint:/);
    expect(key).not.toBe("1.2.3.4");
    expect(key).not.toBe("5.6.7.8");
    expect(key).not.toBe("9.9.9.9");
  });

  it("uses forwarded proxy ip when proxy headers are trusted", async () => {
    process.env.TRUST_PROXY_HEADERS = "true";
    vi.resetModules();

    const { getClientKey } = await import("@/lib/admin-auth-security");
    const request = new Request("http://localhost/login", {
      headers: {
        "x-forwarded-for": "1.2.3.4, 10.0.0.1",
        "x-real-ip": "5.6.7.8",
      },
    });

    expect(getClientKey(request)).toBe("1.2.3.4");
  });
});