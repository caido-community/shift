import { describe, expect, it } from "vitest";

import { createRequestModelOutput, formatRequestRangeReadModelOutput } from "./modelOutput";

describe("createRequestModelOutput", () => {
  it("returns the success message by default", () => {
    const toModelOutput = createRequestModelOutput({
      errorPrefix: "Failed to set request body",
    });

    expect(
      toModelOutput({
        output: {
          kind: "Ok",
          value: { message: "Request body updated" },
        },
      })
    ).toEqual({
      type: "text",
      value: "Request body updated",
    });
  });

  it("supports custom value formatting", () => {
    const toModelOutput = createRequestModelOutput({
      errorPrefix: "Failed to read request",
      formatValue: (value: { message: string; offset: number; endOffset: number }) =>
        `${value.message} (${value.offset}:${value.endOffset})`,
    });

    expect(
      toModelOutput({
        output: {
          kind: "Ok",
          value: {
            message: "Read 20 chars from request",
            offset: 10,
            endOffset: 30,
          },
        },
      })
    ).toEqual({
      type: "text",
      value: "Read 20 chars from request (10:30)",
    });
  });

  it("includes error detail when present", () => {
    const toModelOutput = createRequestModelOutput({
      errorPrefix: "Failed to set header",
    });

    expect(
      toModelOutput({
        output: {
          kind: "Error",
          error: {
            message: "Failed to resolve placeholders",
            detail: "Missing variable API_KEY",
          },
        },
      })
    ).toEqual({
      type: "text",
      value: "Failed to set header: Failed to resolve placeholders\nMissing variable API_KEY",
    });
  });

  it("omits the detail line when it is missing", () => {
    const toModelOutput = createRequestModelOutput({
      errorPrefix: "Failed to add cookie",
    });

    expect(
      toModelOutput({
        output: {
          kind: "Error",
          error: {
            message: "No HTTP request loaded",
          },
        },
      })
    ).toEqual({
      type: "text",
      value: "Failed to add cookie: No HTTP request loaded",
    });
  });
});

describe("formatRequestRangeReadModelOutput", () => {
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
