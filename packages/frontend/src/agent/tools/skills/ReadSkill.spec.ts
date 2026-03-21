import { describe, expect, it } from "vitest";

import { readSkillRange } from "./ReadSkill";

describe("readSkillRange", () => {
  it("returns full content when within limit", () => {
    const content = "hello world";
    const result = readSkillRange(content, 0, 100);
    expect(result.content).toBe("hello world");
    expect(result.offset).toBe(0);
    expect(result.endOffset).toBe(11);
    expect(result.hasMore).toBe(false);
  });

  it("returns chunk when content exceeds limit", () => {
    const content = "x".repeat(5000);
    const result = readSkillRange(content, 0, 1000);
    expect(result.content.length).toBe(1000);
    expect(result.offset).toBe(0);
    expect(result.endOffset).toBe(1000);
    expect(result.hasMore).toBe(true);
  });

  it("supports offset for pagination", () => {
    const content = "abcdefghij";
    const result = readSkillRange(content, 3, 4);
    expect(result.content).toBe("defg");
    expect(result.offset).toBe(3);
    expect(result.endOffset).toBe(7);
    expect(result.hasMore).toBe(true);
  });

  it("clamps offset to 0 when negative", () => {
    const content = "abc";
    const result = readSkillRange(content, -5, 10);
    expect(result.offset).toBe(0);
    expect(result.content).toBe("abc");
  });

  it("respects MAX_LIMIT", () => {
    const content = "x".repeat(50000);
    const result = readSkillRange(content, 0, 50000);
    expect(result.content.length).toBe(20000);
    expect(result.hasMore).toBe(true);
  });
});
