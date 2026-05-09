import { describe, expect, it } from "vitest";
import { readJsonBodyWithLimit } from "@/lib/request-guards";

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
});
