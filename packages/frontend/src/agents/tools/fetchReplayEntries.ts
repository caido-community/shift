import { tool } from "ai";
import { z } from "zod";

import { type ToolContext } from "@/agents/types";

const FetchReplayEntriesSchema = z.object({
  sessionId: z
    .string()
    .optional()
    .describe(
      "Replay session ID to inspect. When omitted, the currently active replay session is used.",
    ),
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" ? value : undefined;

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  isRecord(value) ? value : undefined;

export const fetchReplayEntriesTool = tool({
  description: `List the entries that belong to a Caido replay session.
Use this before grepRequest/grepResponse when you need to understand which requests and responses are present in the replay tab.
The tool returns each entry, some metadata (path, method, etc) and requestId and responseId (if available).`,
  //These entries can be considered as "checkpoints" that you can revert to using the navigateReplayEntry tool.
  inputSchema: FetchReplayEntriesSchema,
  execute: async (input, { experimental_context }) => {
    const context = experimental_context as ToolContext;
    const sessionId = input.sessionId ?? context.replaySession.id;

    try {
      const result = await context.sdk.graphql.replayEntriesBySession({
        sessionId,
      });

      const session = result.replaySession;
      if (session === undefined || session === null) {
        return {
          sessionId,
          entries: [],
          totalEntries: 0,
          error: "Replay session not found.",
        };
      }

      const rawNodes = Array.isArray(session.entries?.nodes)
        ? (session.entries?.nodes ?? [])
        : [];
      const entries = rawNodes.map((rawNode) => {
        const node = asRecord(rawNode);
        const entryIdValue = node?.["id"];
        const entryId =
          typeof entryIdValue === "string" || typeof entryIdValue === "number"
            ? String(entryIdValue)
            : undefined;
        const requestValue =
          node !== undefined ? asRecord(node["request"]) : undefined;
        const responseValue =
          requestValue !== undefined
            ? asRecord(requestValue["response"])
            : undefined;
        const requestDetails =
          requestValue !== undefined
            ? {
                id: asString(requestValue["id"]),
                length: asNumber(requestValue["length"]),
                createdAt: asString(requestValue["createdAt"]),
                host: asString(requestValue["host"]),
                port: asNumber(requestValue["port"]),
                method: asString(requestValue["method"]),
                path: asString(requestValue["path"]),
                query: asString(requestValue["query"]),
                response:
                  responseValue !== undefined
                    ? {
                        id: asString(responseValue["id"]),
                        createdAt: asString(responseValue["createdAt"]),
                        length: asNumber(responseValue["length"]),
                        roundtripTime: asNumber(responseValue["roundtripTime"]),
                        statusCode: asNumber(responseValue["statusCode"]),
                      }
                    : undefined,
              }
            : undefined;
        const responseId = requestDetails?.response?.id;
        return {
          entryIndex: entryId,
          requestId: requestDetails?.id,
          responseId,
          createdAt: asString(node?.["createdAt"]),
          request: requestDetails,
        };
      });

      return {
        sessionId,
        totalEntries: entries.length,
        entries,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        sessionId,
        entries: [],
        totalEntries: 0,
        error: `Failed to fetch replay entries: ${message}`,
      };
    }
  },
});
