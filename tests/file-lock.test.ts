import { describe, expect, it } from "vitest";
import { withFileLock } from "@/lib/file-lock";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("withFileLock", () => {
  it("serializes tasks with the same lock key", async () => {
    const events: string[] = [];

    const first = withFileLock("post-1", async () => {
      events.push("first:start");
      await sleep(30);
      events.push("first:end");
    });

    const second = withFileLock("post-1", async () => {
      events.push("second:start");
      await sleep(5);
      events.push("second:end");
    });

    await Promise.all([first, second]);
    expect(events).toEqual([
      "first:start",
      "first:end",
      "second:start",
      "second:end",
    ]);
  });
});
