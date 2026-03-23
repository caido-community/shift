import { describe, expect, it } from "vitest";

import { formatRequestSendModelOutput } from "./RequestSend";

describe("formatRequestSendModelOutput", () => {
  it("preserves the structured response metadata in text form", () => {
    expect(
      formatRequestSendModelOutput({
        message: "Received 200 OK in 123ms",
        rawResponse: "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nhello",
        roundtripTime: 123,
        responseId: "resp_123",
        statusLine: "200 OK",
      })
    ).toBe(
      "Received 200 OK in 123ms\nStatus line: 200 OK\nRoundtrip time: 123ms\nResponse ID: resp_123\n\nHTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nhello"
    );
  });
});
