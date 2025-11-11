import { tool } from "ai";
import { z } from "zod";

import { type ToolContext } from "@/agents/types";

const ORDER_DIRECTION = ["ASC", "DESC"] as const;

const SearchRequestsSchema = z.object({
  filter: z
    .string()
    .min(1)
    .describe(
      'HTTPQL filter string applied to HTTP history (e.g., req.host.cont:"example.com")',
    ),
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

export const searchRequestsTool = tool({
  description: `This is your Caido search tool. Use this to look at requests that come through Caido's proxy. This is useful for:
    * Investigation of details of how the app/api/domain works
    * Fetching IDs, session cookies, session tokens, etc needed to recreate requests
    * Looking for requests that are successful to learn from them (what auth, CSRF tokens, etc are being used)
    * Looking for requests that are failing to learn from them (what errors are being returned)
    
    The data returned is mostly metadata, but will allow you to proceed to investigate further with your grepRequest and grepResponse tools.
    `,
  inputSchema: SearchRequestsSchema,
  execute: async (input, { experimental_context }) => {
    const context = experimental_context as ToolContext;

    const limit = input.limit ?? 10;
    const offset = input.offset ?? 0;

    try {
      const result = await context.sdk.graphql.requestsByOffset({
        filter: input.filter,
        limit,
        offset,
        order: {
          by: "ID",
          ordering: input.ordering ?? "DESC",
        },
      });

      const connection = result.requestsByOffset;

      if (connection === undefined || connection === null) {
        return {
          requests: [],
          snapshot: null,
          pageInfo: null,
          totalReturned: 0,
          error:
            "No HTTP history found. Verify Caido is connected and the filter is correct.",
        };
      }

      const edges = connection.edges ?? [];
      const requests = edges
        .map((edge) => {
          if (edge === undefined || edge === null) {
            return undefined;
          }

          const node = edge.node;
          if (node === undefined || node === null) {
            return undefined;
          }

          return {
            cursor: edge.cursor,
            id: node.id,
            host: node.host,
            port: node.port,
            path: node.path,
            query: node.query,
            method: node.method,
            isTls: node.isTls,
            createdAt: node.createdAt,
            length: node.length,
            source: node.source,
            response: node.response
              ? {
                  id: node.response.id,
                  statusCode: node.response.statusCode,
                  length: node.response.length,
                  roundtripTime: node.response.roundtripTime,
                  createdAt: node.response.createdAt,
                }
              : null,
          };
        })
        .filter(
          (entry): entry is NonNullable<typeof entry> => entry !== undefined,
        );

      return {
        requests,
        snapshot: connection.snapshot ?? null,
        pageInfo: connection.pageInfo ?? null,
        totalReturned: requests.length,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        error: `Failed to search HTTP history: ${message}`,
      };
    }
  },
});
