import { tool } from "ai";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { isPresent, pluralize } from "@/utils";
import { safeGraphQL } from "@/utils/caido";

const ORDER_DIRECTION = ["ASC", "DESC"] as const;

const requestSchema = z.object({
  id: z.string(),
  host: z.string(),
  port: z.number(),
  path: z.string(),
  query: z.string(),
  method: z.string(),
  isTls: z.boolean(),
  createdAt: z.string(),
  length: z.number(),
  source: z.string(),
  response: z
    .object({
      id: z.string(),
      statusCode: z.number(),
      length: z.number(),
      roundtripTime: z.number(),
      createdAt: z.string(),
    })
    .nullable(),
});

const inputSchema = z.object({
  filter: z
    .string()
    .min(1)
    .describe('HTTPQL filter string applied to HTTP history (e.g., req.host.cont:"example.com")'),
  limit: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe("Maximum number of requests to return (default: 10, max: 100)"),
  offset: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe("Offset into the result set (default: 0)"),
  ordering: z
    .enum(ORDER_DIRECTION)
    .optional()
    .describe("Sort direction when ordering by ID (default: DESC)"),
});

const valueSchema = z.object({
  requests: z.array(requestSchema),
  totalReturned: z.number(),
});

const outputSchema = ToolResult.schema(valueSchema);

type HistorySearchInput = z.infer<typeof inputSchema>;
type HistorySearchValue = z.infer<typeof valueSchema>;
type HistorySearchOutput = ToolResultType<HistorySearchValue>;

type RequestEntry = z.infer<typeof requestSchema>;

export const display = {
  streaming: ({ input }) =>
    input
      ? [{ text: "Searching for " }, { text: input.filter, muted: true }]
      : [{ text: "Searching " }, { text: "history", muted: true }],
  success: ({ output }) =>
    output
      ? [
          { text: "Found " },
          {
            text: `${output.totalReturned} ${pluralize(output.totalReturned, "request")}`,
            muted: true,
          },
        ]
      : [{ text: "Found " }, { text: "requests", muted: true }],
  error: () => "Failed to search HTTP history",
} satisfies ToolDisplay<HistorySearchInput, HistorySearchValue>;

export const HistorySearch = tool({
  description: `Search Caido's HTTP history using HTTPQL filters. Useful for:
- Finding requests by host, path, method, or response code
- Fetching IDs, cookies, session tokens needed to recreate requests
- Investigating how the application/API works
- Finding successful or failed requests to learn from`,
  inputSchema,
  outputSchema,
  execute: async (
    { filter, limit = 10, offset = 0, ordering = "DESC" },
    { experimental_context }
  ): Promise<HistorySearchOutput> => {
    const context = experimental_context as AgentContext;

    const graphqlResult = await safeGraphQL(
      () =>
        context.sdk.graphql.requestsByOffset({
          filter,
          limit,
          offset,
          order: {
            by: "ID",
            ordering,
          },
        }),
      "Failed to query HTTP history"
    );

    if (graphqlResult.kind === "Error") {
      return ToolResult.err("Failed to query HTTP history", graphqlResult.error);
    }

    const result = graphqlResult.value;

    const connection = result.requestsByOffset;

    if (!isPresent(connection)) {
      return ToolResult.err(
        "No HTTP history found",
        "Verify Caido is connected and the filter is correct"
      );
    }

    const edges = connection.edges ?? [];
    const requests: RequestEntry[] = [];

    for (const edge of edges) {
      if (!isPresent(edge?.node)) {
        continue;
      }

      const node = edge.node;
      requests.push({
        id: node.id,
        host: node.host,
        port: node.port,
        path: node.path,
        query: node.query,
        method: node.method,
        isTls: node.isTls,
        createdAt: (node.createdAt as unknown as Date).toISOString(),
        length: node.length,
        source: node.source as unknown as string,
        response: isPresent(node.response)
          ? {
              id: node.response.id,
              statusCode: node.response.statusCode,
              length: node.response.length,
              roundtripTime: node.response.roundtripTime,
              createdAt: (node.response.createdAt as unknown as Date).toISOString(),
            }
          : null,
      });
    }

    const totalReturned = requests.length;

    return ToolResult.ok({
      message:
        totalReturned > 0
          ? `Found ${totalReturned} ${pluralize(totalReturned, "request")} matching "${filter}"`
          : `No requests found matching "${filter}"`,
      requests,
      totalReturned,
    });
  },
});
