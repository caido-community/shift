import { tool } from "ai";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { isPresent } from "@/utils";

const DEFAULT_LIMIT = 5000;
const MAX_LIMIT = 20000;

const inputSchema = z.object({
  offset: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe("Character offset to start reading from (default: 0)."),
  limit: z
    .number()
    .int()
    .positive()
    .max(MAX_LIMIT)
    .optional()
    .describe("Maximum number of characters to return (default: 5000, max: 20000)."),
});

const valueSchema = z.object({
  content: z.string(),
  offset: z.number(),
  endOffset: z.number(),
  requestLength: z.number(),
  hasMore: z.boolean(),
});

const outputSchema = ToolResult.schema(valueSchema);

type RequestRangeReadInput = z.infer<typeof inputSchema>;
type RequestRangeReadValue = z.infer<typeof valueSchema>;
type RequestRangeReadOutput = ToolResultType<RequestRangeReadValue>;

export const display = {
  streaming: ({ input }) => {
    if (!isPresent(input)) {
      return [{ text: "Reading " }, { text: "request", muted: true }];
    }
    const offset = input.offset ?? 0;
    const limit = input.limit ?? DEFAULT_LIMIT;
    return [
      { text: "Reading " },
      { text: "request", muted: true },
      { text: " " },
      { text: `[${offset}:${offset + limit}]`, muted: true },
    ];
  },
  success: ({ output }) => {
    if (!isPresent(output)) {
      return [{ text: "Read " }, { text: "request", muted: true }];
    }
    return [
      { text: "Read " },
      { text: `${output.endOffset - output.offset} chars`, muted: true },
      ...(output.hasMore ? [{ text: " (more available)" }] : []),
    ];
  },
  error: () => "Failed to read request",
} satisfies ToolDisplay<RequestRangeReadInput, RequestRangeReadValue>;

export const RequestRangeRead = tool({
  description:
    "Read a specific character range from the current HTTP request in the replay session. Use this to inspect large requests without loading the entire raw request into model context. Supports chunk-by-chunk reading with offset and limit.",
  inputSchema,
  outputSchema,
  execute: ({ offset, limit }, { experimental_context }): RequestRangeReadOutput => {
    const context = experimental_context as AgentContext;
    const request = context.httpRequest;

    if (request === "") {
      return ToolResult.err("No HTTP request loaded");
    }

    const safeOffset = offset ?? 0;
    if (safeOffset >= request.length) {
      return ToolResult.err(
        "Request offset out of bounds",
        `Offset ${safeOffset} exceeds request length ${request.length}`
      );
    }

    const safeLimit = limit ?? DEFAULT_LIMIT;
    const endOffset = Math.min(request.length, safeOffset + safeLimit);
    return ToolResult.ok({
      message: `Read ${endOffset - safeOffset} chars from request`,
      content: request.slice(safeOffset, endOffset),
      offset: safeOffset,
      endOffset,
      requestLength: request.length,
      hasMore: endOffset < request.length,
    });
  },
});
