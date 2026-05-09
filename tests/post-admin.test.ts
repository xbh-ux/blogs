import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  isPathInsideDirectory,
  isSafePostId,
  normalizePostInput,
} from "@/lib/post-admin";

describe("post-admin input normalization", () => {
  it("normalizes valid payload", () => {
    const payload = {
      title: "Hello",
      date: "2026-05-09",
      tags: ["nextjs", "blog"],
      content: "<p>content</p>",
    };
    const result = normalizePostInput(payload);
    expect(result.data).toEqual({
      title: "Hello",
      date: "2026-05-09",
      tags: ["nextjs", "blog"],
      content: "<p>content</p>",
    });
  });

  it("rejects invalid date and empty content", () => {
    const badDate = normalizePostInput({
      title: "Hello",
      date: "2026-02-31",
      content: "<p>content</p>",
    });
    expect(badDate.data).toBeNull();
    expect(badDate.error).toContain("日期");

    const emptyContent = normalizePostInput({
      title: "Hello",
      date: "2026-05-09",
      content: "<p><br></p>",
    });
    expect(emptyContent.data).toBeNull();
    expect(emptyContent.error).toContain("内容");
  });
});

describe("post-admin path and slug safety", () => {
  it("accepts expected slug patterns", () => {
    expect(isSafePostId("hello-world")).toBe(true);
    expect(isSafePostId("2026/hello-world")).toBe(true);
  });

  it("blocks traversal and reserved names", () => {
    expect(isSafePostId("../x")).toBe(false);
    expect(isSafePostId("hello/../x")).toBe(false);
    expect(isSafePostId("con")).toBe(false);
  });

  it("checks file path inside target directory", () => {
    const root = path.resolve("posts");
    const inside = path.join(root, "2026", "hello.md");
    const outside = path.resolve(root, "..", "README.md");

    expect(isPathInsideDirectory(inside, root)).toBe(true);
    expect(isPathInsideDirectory(outside, root)).toBe(false);
  });
});
