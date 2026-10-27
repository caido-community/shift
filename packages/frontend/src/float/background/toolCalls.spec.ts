import { describe, expect, it } from "vitest";

import { getInvalidToolCallMessage } from "./toolCalls";

describe("getInvalidToolCallMessage", () => {
  it("prefers string error details", () => {
    expect(
      getInvalidToolCallMessage({
        toolName: "historyRead",
        error: "missing requestIds",
      })
    ).toBe("historyRead: missing requestIds");
  });

  it("uses the background agent spawn guard message", () => {
    expect(
      getInvalidToolCallMessage({
        toolName: "backgroundAgentSpawn",
      })
    ).toBe("backgroundAgentSpawn: background agents cannot spawn other background agents");
  });

  it("falls back to a generic invalid input message", () => {
    expect(
      getInvalidToolCallMessage({
        toolName: "historyRead",
        error: new Error("boom"),
      })
    ).toBe("historyRead: invalid tool input");
  });
});
