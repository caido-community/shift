import { describe, expect, it } from "vitest";

import { readLearningRange } from "./LearningRead";

describe("readLearningRange", () => {
  it("returns full content when within limit", () => {
    const result = readLearningRange("hello world", 0, 100);
    expect(result.content).toBe("hello world");
    expect(result.offset).toBe(0);
    expect(result.endOffset).toBe(11);
    expect(result.hasMore).toBe(false);
  });

  it("supports pagination", () => {
    const result = readLearningRange("abcdefghij", 2, 4);
    expect(result.content).toBe("cdef");
    expect(result.offset).toBe(2);
    expect(result.endOffset).toBe(6);
    expect(result.hasMore).toBe(true);
  });

  it("clamps limit to the maximum", () => {
    const result = readLearningRange("x".repeat(50000), 0, 50000);
    expect(result.content.length).toBe(20000);
    expect(result.hasMore).toBe(true);
  });
});
