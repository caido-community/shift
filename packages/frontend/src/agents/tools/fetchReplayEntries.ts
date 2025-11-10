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

type ReplayEntryNode = {
  id?: string | null;
  createdAt?: string | null;
  request?: {
    id?: string | null;
    length?: number | null;
    createdAt?: string | null;
    host?: string | null;
    port?: number | null;
    method?: string | null;
    path?: string | null;
    query?: string | null;
    response?: {
      id?: string | null;
      createdAt?: string | null;
      length?: number | null;
      roundtripTime?: number | null;
      statusCode?: number | null;
    } | null;
  } | null;
} | null;

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

      const nodes = (session.entries?.nodes ?? []) as ReplayEntryNode[];
      const entries = nodes.map((node) => {
        const entryId = node?.id ?? undefined;
        const request = node?.request ?? undefined;
        const requestId = request?.id ?? undefined;
        const responseId = request?.response?.id ?? undefined;
        const requestDetails =
          request !== undefined
            ? {
                id: requestId,
                length: request?.length ?? undefined,
                createdAt: request?.createdAt ?? undefined,
                host: request?.host ?? undefined,
                port: request?.port ?? undefined,
                method: request?.method ?? undefined,
                path: request?.path ?? undefined,
                query: request?.query ?? undefined,
                response:
                  request?.response !== undefined && request?.response !== null
                    ? {
                        id: responseId,
                        createdAt: request.response.createdAt ?? undefined,
                        length: request.response.length ?? undefined,
                        roundtripTime: request.response.roundtripTime ?? undefined,
                        statusCode: request.response.statusCode ?? undefined,
                      }
                    : undefined,
              }
            : undefined;
        return {
          entryIndex: entryId,
          requestId,
          responseId,
          createdAt: node?.createdAt ?? undefined,
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


