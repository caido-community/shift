import { tool } from "ai";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { getReplaySession } from "@/utils/caido";
import { formatStringWithSuffix } from "@/utils/text";

const inputSchema = z.object({});

const valueSchema = z.object({
  rawResponse: z.string(),
  roundtripTime: z.number(),
  responseId: z.string(),
  statusLine: z.string(),
});

const outputSchema = ToolResult.schema(valueSchema);

type RequestSendInput = z.infer<typeof inputSchema>;
type RequestSendValue = z.infer<typeof valueSchema>;
type RequestSendOutput = ToolResultType<RequestSendValue>;

const extractStatusLine = (rawResponse: string): string => {
  const firstLine = rawResponse.split("\n")[0]?.trim() ?? "";
  const match = firstLine.match(/^HTTP\/[\d.]+ (\d+ .+)$/);
  return match?.[1] ?? firstLine;
};

const UNINTERESTING_HEADERS = new Set([
  "server",
  "pragma",
  "vary",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "accept-ranges",
  "etag",
  "last-modified",
  "expires",
  "via",
  "x-powered-by",
  "x-aspnet-version",
  "x-aspnetmvc-version",
  "x-request-id",
  "x-correlation-id",
  "x-trace-id",
  "cf-ray",
  "nel",
  "report-to",
  "alt-svc",
]);

const filterResponseHeaders = (rawResponse: string): string => {
  const headerEndIndex = rawResponse.indexOf("\r\n\r\n");
  if (headerEndIndex === -1) {
    return rawResponse;
  }

  const headerSection = rawResponse.substring(0, headerEndIndex);
  const body = rawResponse.substring(headerEndIndex);

  const lines = headerSection.split("\r\n");
  const statusLine = lines[0] ?? "";
  const headers = lines.slice(1);

  const filteredHeaders = headers.filter((header) => {
    const colonIndex = header.indexOf(":");
    if (colonIndex === -1) return true;
    const headerName = header.substring(0, colonIndex).trim().toLowerCase();
    return !UNINTERESTING_HEADERS.has(headerName);
  });

  return [statusLine, ...filteredHeaders].join("\r\n") + body;
};

export const display = {
  streaming: () => [{ text: "Sending " }, { text: "request", muted: true }],
  success: ({ output }) =>
    output
      ? [
          { text: "Received " },
          { text: output.statusLine, muted: true },
          { text: " response in " },
          { text: `${output.roundtripTime}ms`, muted: true },
        ]
      : [{ text: "Received " }, { text: "response", muted: true }],
  error: () => "Failed to send request",
} satisfies ToolDisplay<RequestSendInput, RequestSendValue>;

export const RequestSend = tool({
  description:
    "Send the current HTTP request to the target server and wait for a response. Use this after modifying the request with other tools to test changes, verify behavior, or continue an attack workflow. The request is sent using the connection settings from the replay session (host, port, TLS). Returns the response (truncated to 5k chars if larger) with non-security-relevant headers filtered out, roundtrip time in milliseconds, response ID for use with ResponseSearch/ResponseRangeRead, and the status line. Times out after 30 seconds.",
  inputSchema,
  outputSchema,
  execute: async (_input, { abortSignal, experimental_context }): Promise<RequestSendOutput> => {
    const context = experimental_context as AgentContext;
    const sdk = context.sdk;

    const replaySessionResult = await getReplaySession(sdk, context.sessionId);
    if (replaySessionResult.kind === "Error") {
      return ToolResult.err("Failed to get replay session", replaySessionResult.error);
    }

    const replaySession = replaySessionResult.value;

    await sdk.replay.sendRequest(replaySession.id, {
      connectionInfo: {
        host: replaySession.request.host,
        isTLS: replaySession.request.isTLS,
        port: replaySession.request.port,
      },
      raw: context.httpRequest,
      background: true,
    });

    let responseId: string | undefined = undefined;
    const iterator = sdk.graphql.updatedReplaySession({});

    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout after 30 seconds")), 30000);
    });

    const abortPromise = new Promise<never>((_, reject) => {
      abortSignal?.addEventListener("abort", () => {
        if (location.hash !== "#/replay") return;
        const currentSession = sdk.replay.getCurrentSession();
        if (currentSession?.id === replaySession.id) {
          document.querySelector<HTMLButtonElement>('button[aria-label="Cancel"]')?.click();
        }
        reject(new Error("Request cancelled"));
      });
    });

    const responsePromise = (async () => {
      for await (const event of iterator) {
        if (event.updatedReplaySession.sessionEdge.node.id === replaySession.id) {
          responseId =
            event.updatedReplaySession.sessionEdge.node.activeEntry?.request?.response?.id;
          break;
        }
      }
    })();

    try {
      await Promise.race([responsePromise, timeout, abortPromise]);
    } catch (error) {
      return ToolResult.err((error as Error).message);
    }

    if (responseId === undefined) {
      return ToolResult.err("No response received");
    }

    const result = await sdk.graphql.response({
      id: responseId,
    });

    if (result.response === undefined || result.response === null) {
      return ToolResult.err("Failed to retrieve response");
    }

    const statusLine = extractStatusLine(result.response.raw);
    const filteredResponse = filterResponseHeaders(result.response.raw);

    const maxResponseLength = 5000;
    const totalLength = filteredResponse.length;
    const remainingLength = totalLength - maxResponseLength;
    const suffix =
      totalLength > maxResponseLength
        ? `\n[...truncated. ${remainingLength} bytes remaining. Response ID: ${responseId}]`
        : "";

    return ToolResult.ok({
      message: `Received ${statusLine} in ${result.response.roundtripTime}ms`,
      rawResponse: formatStringWithSuffix(filteredResponse, maxResponseLength, suffix),
      roundtripTime: result.response.roundtripTime,
      responseId,
      statusLine,
    });
  },
});
