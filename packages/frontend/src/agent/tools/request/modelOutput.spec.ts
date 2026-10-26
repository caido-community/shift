import { describe, expect, it } from "vitest";

import { createRequestModelOutput, formatRequestRangeReadModelOutput } from "./modelOutput";

describe("request model output", () => {
  it("prefixes errors and adds the detail line when present", () => {
    const toModelOutput = createRequestModelOutput({ errorPrefix: "Failed to set header" });

    expect(
      toModelOutput({
        output: { kind: "Error", error: { message: "Missing variable", detail: "API_KEY" } },
      })
    ).toEqual({ type: "error-text", value: "Failed to set header: Missing variable\nAPI_KEY" });
    expect(
      toModelOutput({ output: { kind: "Error", error: { message: "No HTTP request loaded" } } })
    ).toEqual({ type: "error-text", value: "Failed to set header: No HTTP request loaded" });
  });

  it("formats range metadata and content as readable text", () => {
    expect(
      formatRequestRangeReadModelOutput({
        message: "Read 5 chars from request",
        content: "hello",
        offset: 10,
        endOffset: 15,
        requestLength: 42,
        hasMore: true,
      })
    ).toBe("Read 5 chars from request\nRange: [10:15] of 42\nMore available: yes\n\nhello");
  });
});
