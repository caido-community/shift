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
  description: `Search Caido's HTTP history database using HTTPQL filter syntax. Use this to find previous requests and responses captured by the proxy, which is essential for understanding application behavior, extracting authentication tokens, finding API endpoints, or locating specific traffic patterns.

Common HTTPQL filter examples:
- req.host.cont:"example.com" - requests containing "example.com" in the host
- req.method.eq:"POST" - only POST requests
- resp.code.eq:200 - requests with 200 response code
- req.path.cont:"/api/" - requests with "/api/" in the path
- req.body.cont:"password" - requests containing "password" in body

Returns request metadata (id, host, port, path, query, method, isTls, createdAt, length, source) and response metadata (id, statusCode, length, roundtripTime, createdAt) when available. Use the returned request/response IDs with other tools. Results are sorted by ID (newest first by default). Does not return full request/response bodies - use the IDs with other tools to fetch full content.`,
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
