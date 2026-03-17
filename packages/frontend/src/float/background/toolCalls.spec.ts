import { describe, expect, it } from "vitest";

import { getInvalidToolCallMessage, isInvalidToolCall, isValidToolCall } from "./toolCalls";

describe("isInvalidToolCall", () => {
  it("detects invalid tool calls", () => {
    expect(isInvalidToolCall({ toolName: "historyRead", invalid: true })).toBe(true);
    expect(isValidToolCall({ toolName: "historyRead", invalid: true })).toBe(false);
  });

  it("treats normal tool calls as valid", () => {
    expect(isInvalidToolCall({ toolName: "historyRead" })).toBe(false);
    expect(isValidToolCall({ toolName: "historyRead" })).toBe(true);
  });

  it("rejects non-object values", () => {
    expect(isInvalidToolCall("historyRead")).toBe(false);
    expect(isInvalidToolCall(undefined)).toBe(false);
  });
});

describe("getInvalidToolCallMessage", () => {
  it("prefers string error details", () => {
    expect(
      getInvalidToolCallMessage({
        toolName: "historyRead",
        invalid: true,
        error: "missing requestIds",
      })
    ).toBe("historyRead: missing requestIds");
  });

  it("uses the background agent spawn guard message", () => {
    expect(
      getInvalidToolCallMessage({
        toolName: "backgroundAgentSpawn",
        invalid: true,
      })
    ).toBe("backgroundAgentSpawn: background agents cannot spawn other background agents");
  });

  it("falls back to a generic invalid input message", () => {
    expect(
      getInvalidToolCallMessage({
        toolName: "historyRead",
        invalid: true,
        error: new Error("boom"),
      })
    ).toBe("historyRead: invalid tool input");
  });
});
