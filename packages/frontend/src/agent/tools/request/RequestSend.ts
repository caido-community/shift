import { tool } from "ai";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { type FrontendSDK } from "@/types";
import {
  type AnyReplayEntry,
  getActiveEntryRequest,
  getReplaySession,
  setActiveEntryDraftRaw,
  startReplayTaskDirect,
  writeToRequestEditor,
} from "@/utils/caido";
import type { UndefinedOrNull } from "@/utils/optional";
import { truncate } from "@/utils/text";

const inputSchema = z.object({});

const valueSchema = z.object({
  rawResponse: z.string(),
  roundtripTime: z.number(),
  responseId: z.string(),
  statusLine: z.string(),
  entryId: z.string().optional(),
});

const outputSchema = ToolResult.schema(valueSchema);

type RequestSendInput = z.infer<typeof inputSchema>;
type RequestSendValue = z.infer<typeof valueSchema>;
type RequestSendOutput = ToolResultType<RequestSendValue>;

type ActiveEntryIds = { entryId: string | undefined; responseId: string | undefined };

const toActiveEntryIds = (
  activeEntry: (AnyReplayEntry & { id: string }) | UndefinedOrNull
): ActiveEntryIds => ({
  entryId: activeEntry?.id,
  responseId: getActiveEntryRequest(activeEntry)?.response?.id ?? undefined,
});

const getSessionEntries = async (sdk: FrontendSDK, sessionId: string) => {
  const result = await sdk.graphql.replaySessionEntries({ id: sessionId });
  return {
    active: toActiveEntryIds(result.replaySession?.activeEntry),
    entryIds: result.replaySession?.entries.edges.map((edge) => edge.node.id) ?? [],
  };
};

const sleep = (duration: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, duration));

export const formatRequestSendModelOutput = (value: {
  message: string;
  rawResponse: string;
  roundtripTime: number;
  responseId: string;
  statusLine: string;
}): string =>
  `${value.message}\nStatus line: ${value.statusLine}\nRoundtrip time: ${value.roundtripTime}ms\nResponse ID: ${value.responseId}\n\n${value.rawResponse}`;

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

    const previousEntryIds = new Set((await getSessionEntries(sdk, replaySession.id)).entryIds);

    let responseId: string | undefined = undefined;
    let entryId: string | undefined = undefined;

    const captureActiveEntry = (next: ActiveEntryIds): boolean => {
      if (
        next.responseId !== undefined &&
        next.entryId !== undefined &&
        !previousEntryIds.has(next.entryId)
      ) {
        responseId = next.responseId;
        entryId = next.entryId;
        return true;
      }

      return false;
    };

    try {
      const currentSession = sdk.replay.getCurrentSession();
      const onAgentTab = location.hash === "#/replay" && currentSession?.id === replaySession.id;

      if (onAgentTab) {
        writeToRequestEditor(context.httpRequest);
        await sdk.replay.sendRequest(replaySession.id, {
          background: false,
        });
      } else {
        const draftSync = await setActiveEntryDraftRaw(sdk, replaySession, context.httpRequest);
        if (draftSync.kind === "Error") {
          return ToolResult.err(
            "Failed to sync request into the session draft before sending",
            draftSync.error
          );
        }

        const taskResult = await startReplayTaskDirect(sdk, replaySession.id);
        if (taskResult.kind === "Error") {
          return ToolResult.err("Failed to start replay task", taskResult.error);
        }
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown error occurred";
      return ToolResult.err("Failed to send request", detail);
    }

    const subscription = sdk.graphql.updatedReplaySession({})[Symbol.asyncIterator]();
    let isWaiting = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let onAbort: (() => void) | undefined;

    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("Request timeout after 30 seconds")), 30000);
    });

    const abortPromise = new Promise<never>((_, reject) => {
      onAbort = () => {
        const currentSession = sdk.replay.getCurrentSession();
        if (location.hash === "#/replay" && currentSession?.id === replaySession.id) {
          document.querySelector<HTMLButtonElement>('button[aria-label="Cancel"]')?.click();
        }
        reject(new DOMException("Request aborted", "AbortError"));
      };
      if (abortSignal?.aborted === true) {
        onAbort();
      } else {
        abortSignal?.addEventListener("abort", onAbort, { once: true });
      }
    });

    const responsePromise = (async () => {
      while (isWaiting) {
        const event = await subscription.next();
        if (event.done === true) return;
        const node = event.value.updatedReplaySession.sessionEdge.node;
        if (
          node.id === replaySession.id &&
          captureActiveEntry(toActiveEntryIds(node.activeEntry))
        ) {
          return;
        }
      }
    })();

    const pollResponsePromise = (async () => {
      while (isWaiting && responseId === undefined) {
        if (captureActiveEntry((await getSessionEntries(sdk, replaySession.id)).active)) {
          return;
        }

        await sleep(250);
      }
    })();

    // Race losers may still reject after cleanup.
    responsePromise.catch(() => undefined);
    pollResponsePromise.catch(() => undefined);

    try {
      await Promise.race([responsePromise, pollResponsePromise, timeout, abortPromise]);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }
      return ToolResult.err((error as Error).message);
    } finally {
      isWaiting = false;
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      if (onAbort !== undefined) abortSignal?.removeEventListener("abort", onAbort);
      void subscription.return?.();
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
      rawResponse: truncate(filteredResponse, maxResponseLength, suffix),
      roundtripTime: result.response.roundtripTime,
      responseId,
      statusLine,
      entryId,
    });
  },
  toModelOutput: ({ output }) => {
    switch (output.kind) {
      case "Ok":
        return {
          type: "text",
          value: formatRequestSendModelOutput(output.value),
        };
      case "Error":
        return {
          type: "error-text",
          value:
            output.error.detail !== undefined && output.error.detail !== ""
              ? `Failed to send request: ${output.error.message}\n${output.error.detail}`
              : `Failed to send request: ${output.error.message}`,
        };
      default:
        return {
          type: "text",
          value: "Unknown error",
        };
    }
  },
});
