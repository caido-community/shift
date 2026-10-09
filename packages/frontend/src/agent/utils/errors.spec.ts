import { APICallError } from "@ai-sdk/provider";
import { describe, expect, it } from "vitest";

import { formatAgentError } from "./errors";

describe("formatAgentError", () => {
  it("explains an interrupted provider stream without claiming a safeguard caused it", () => {
    const error = new APICallError({
      message: "stream ended before a terminal event was received",
      url: "http://localhost:8080/ai/stream",
      requestBodyValues: {},
      isRetryable: false,
      data: {
        kind: "truncated-stream",
        message: "stream ended before a terminal event was received",
        origin: "openai-responses",
        model: "gpt-5.6-sol",
        requestId: "req_safeguard_56",
        retryable: false,
      },
    });

    expect(formatAgentError(error)).toBe(
      "The provider interrupted this response before reporting a final status. A provider safeguard or connection interruption may have stopped it. Some actions may already have run, so review the session before retrying. Request ID: req_safeguard_56"
    );
  });

  it("preserves other provider errors", () => {
    expect(formatAgentError(new Error("Unsupported parameter: temperature"))).toBe(
      "Unsupported parameter: temperature"
    );
  });
});
