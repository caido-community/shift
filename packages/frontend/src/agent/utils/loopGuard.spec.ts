import { describe, expect, it } from "vitest";

import { hasRepeatedToolCalls, REPEATED_TOOL_CALL_LIMIT } from "./loopGuard";

function todoAddStep(content: string) {
  return { toolCalls: [{ toolName: "TodoAdd", input: { content: [content] } }] };
}

describe("hasRepeatedToolCalls", () => {
  it("returns false when there are fewer steps than the limit", () => {
    const steps = Array.from({ length: REPEATED_TOOL_CALL_LIMIT - 1 }, () =>
      todoAddStep("Say hello")
    );

    expect(hasRepeatedToolCalls(steps)).toBe(false);
  });

  it("detects the same tool call repeated up to the limit", () => {
    const steps = Array.from({ length: REPEATED_TOOL_CALL_LIMIT }, () => todoAddStep("Say hello"));

    expect(hasRepeatedToolCalls(steps)).toBe(true);
  });

  it("does not trip when recent calls differ", () => {
    const steps = [
      todoAddStep("a"),
      todoAddStep("a"),
      todoAddStep("a"),
      todoAddStep("a"),
      todoAddStep("b"),
    ];

    expect(hasRepeatedToolCalls(steps)).toBe(false);
  });

  it("ignores steps without tool calls", () => {
    const steps = [
      { toolCalls: [] },
      todoAddStep("x"),
      todoAddStep("x"),
      todoAddStep("x"),
      todoAddStep("x"),
      todoAddStep("x"),
    ];

    expect(hasRepeatedToolCalls(steps)).toBe(true);
  });

  it("treats different argument values as progress", () => {
    const steps = [
      todoAddStep("1"),
      todoAddStep("2"),
      todoAddStep("3"),
      todoAddStep("4"),
      todoAddStep("5"),
    ];

    expect(hasRepeatedToolCalls(steps)).toBe(false);
  });
});
