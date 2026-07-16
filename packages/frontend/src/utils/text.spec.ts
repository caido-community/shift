import { describe, expect, it } from "vitest";

import { hasThinkTag, stripThinkTags } from "./text";

describe("stripThinkTags", () => {
  it("removes an empty think block", () => {
    expect(stripThinkTags("<think>\n\n</think>\n\nHello World")).toBe("Hello World");
  });

  it("removes a think block with content", () => {
    expect(stripThinkTags("<think>reasoning here</think>Answer")).toBe("Answer");
  });

  it("removes multiple think blocks", () => {
    expect(stripThinkTags("<think>a</think>one<think>b</think>two")).toBe("onetwo");
  });

  it("returns empty string when only a think block is present", () => {
    expect(stripThinkTags("<think></think>")).toBe("");
  });

  it("leaves text without think tags unchanged (trimmed)", () => {
    expect(stripThinkTags("just text")).toBe("just text");
  });

  it("keeps a dangling open think tag by default", () => {
    expect(stripThinkTags("answer <think>partial reasoning")).toBe(
      "answer <think>partial reasoning"
    );
  });

  it("strips a dangling open think tag when streaming", () => {
    expect(stripThinkTags("answer <think>partial reasoning", { stripDangling: true })).toBe(
      "answer"
    );
  });

  it("is case-insensitive", () => {
    expect(stripThinkTags("<THINK>x</THINK>done")).toBe("done");
  });
});

describe("hasThinkTag", () => {
  it("detects a think tag", () => {
    expect(hasThinkTag("<think>x</think>")).toBe(true);
  });

  it("returns false without a think tag", () => {
    expect(hasThinkTag("plain text")).toBe(false);
  });
});
