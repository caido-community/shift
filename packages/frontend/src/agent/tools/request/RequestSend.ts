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
    "Send the current HTTP request. Returns the response with rawResponse, roundtripTime, and responseId.",
  inputSchema,
  outputSchema,
  execute: async (_input, { experimental_context }): Promise<RequestSendOutput> => {
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
      await Promise.race([responsePromise, timeout]);
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

    const maxResponseLength = 5000;
    const totalLength = result.response.raw.length;
    const remainingLength = totalLength - maxResponseLength;
    const suffix =
      totalLength > maxResponseLength
        ? `[...] (truncated after ${maxResponseLength} bytes. ${remainingLength} bytes remaining. The full response is ${totalLength} bytes. Response ID: ${responseId})`
        : "";

    return ToolResult.ok({
      message: `Received ${statusLine} in ${result.response.roundtripTime}ms`,
      rawResponse: formatStringWithSuffix(result.response.raw, maxResponseLength, suffix),
      roundtripTime: result.response.roundtripTime,
      responseId,
      statusLine,
    });
  },
});
