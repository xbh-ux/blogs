import { describe, expect, it } from "vitest";
import {
  enforceSameOrigin,
  readJsonBodyWithLimit,
} from "@/lib/request-guards";

describe("readJsonBodyWithLimit", () => {
  it("parses json payload under limit", async () => {
    const request = new Request("http://localhost/test", {
      method: "POST",
      body: JSON.stringify({ title: "hello" }),
      headers: { "content-type": "application/json" },
    });

    const result = await readJsonBodyWithLimit<{ title: string }>(request, 1024);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.title).toBe("hello");
    }
  });

  it("rejects oversized payload", async () => {
    const request = new Request("http://localhost/test", {
      method: "POST",
      body: JSON.stringify({ content: "x".repeat(2048) }),
      headers: { "content-type": "application/json" },
    });

    const result = await readJsonBodyWithLimit(request, 128);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(413);
    }
  });

  it("rejects non-json content type", async () => {
    const request = new Request("http://localhost/test", {
      method: "POST",
      body: "title=hello",
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });

    const result = await readJsonBodyWithLimit(request, 1024);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(415);
    }
  });
});

describe("enforceSameOrigin", () => {
  it("accepts matching origin header", () => {
    const request = new Request("https://blog.example.com/api/admin/create", {
      method: "POST",
      headers: {
        origin: "https://blog.example.com",
      },
    });

    expect(enforceSameOrigin(request)).toEqual({ ok: true });
  });

  it("accepts matching referer when origin is absent", () => {
    const request = new Request("https://blog.example.com/api/admin/create", {
      method: "POST",
      headers: {
        referer: "https://blog.example.com/admin/new",
      },
    });

    expect(enforceSameOrigin(request)).toEqual({ ok: true });
  });

  it("accepts same-origin fetch metadata as fallback", () => {
    const request = new Request("https://blog.example.com/api/admin/create", {
      method: "POST",
      headers: {
        "sec-fetch-site": "same-origin",
      },
    });

    expect(enforceSameOrigin(request)).toEqual({ ok: true });
  });

  it("rejects cross-origin origin header", () => {
    const request = new Request("https://blog.example.com/api/admin/create", {
      method: "POST",
      headers: {
        origin: "https://evil.example.com",
      },
    });

    expect(enforceSameOrigin(request)).toMatchObject({ ok: false, status: 403 });
  });

  it("rejects requests without origin evidence", () => {
    const request = new Request("https://blog.example.com/api/admin/create", {
      method: "POST",
    });

    expect(enforceSameOrigin(request)).toMatchObject({ ok: false, status: 403 });
  });
});

