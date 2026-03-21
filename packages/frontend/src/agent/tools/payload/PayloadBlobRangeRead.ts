import { tool } from "ai";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { isPresent } from "@/utils";

const DEFAULT_LIMIT = 5000;
const MAX_LIMIT = 20000;

type ReadBlobRangeResult = {
  content: string;
  offset: number;
  endOffset: number;
  blobLength: number;
  hasMore: boolean;
};

/**
 * Pure helper: read a character range from blob content. Testable without context.
 */
function readBlobRange(content: string, offset: number, limit: number): ReadBlobRangeResult {
  const safeOffset = Math.max(0, offset);
  const safeLimit = Math.max(1, Math.min(limit, MAX_LIMIT));
  const endOffset = Math.min(content.length, safeOffset + safeLimit);
  return {
    content: content.slice(safeOffset, endOffset),
    offset: safeOffset,
    endOffset,
    blobLength: content.length,
    hasMore: endOffset < content.length,
  };
}

const inputSchema = z.object({
  blobId: z
    .string()
    .min(1)
    .describe("The blob ID (e.g. from a trimmed tool output or PayloadBlobCreate)."),
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
    .describe(
      `Maximum number of characters to return (default: ${DEFAULT_LIMIT}, max: ${MAX_LIMIT}).`
    ),
});

const valueSchema = z.object({
  content: z.string(),
  offset: z.number(),
  endOffset: z.number(),
  blobLength: z.number(),
  hasMore: z.boolean(),
});

const outputSchema = ToolResult.schema(valueSchema);

type PayloadBlobRangeReadInput = z.infer<typeof inputSchema>;
type PayloadBlobRangeReadValue = z.infer<typeof valueSchema>;
type PayloadBlobRangeReadOutput = ToolResultType<PayloadBlobRangeReadValue>;

export const display = {
  streaming: ({ input }) => {
    if (!isPresent(input)) {
      return [{ text: "Reading " }, { text: "payload blob", muted: true }];
    }
    const offset = input.offset ?? 0;
    const limit = input.limit ?? DEFAULT_LIMIT;
    return [
      { text: "Reading " },
      { text: "payload blob", muted: true },
      { text: " " },
      { text: input.blobId, muted: true },
      { text: ` [${offset}:${offset + limit}]`, muted: true },
    ];
  },
  success: ({ output }) => {
    if (!isPresent(output)) {
      return [{ text: "Read  " }, { text: "payload blob", muted: true }];
    }
    return [
      { text: "Read blob " },
      { text: `${output.endOffset - output.offset} chars`, muted: true },
      ...(output.hasMore ? [{ text: " (more available)" }] : []),
    ];
  },
  error: () => "Failed to read payload blob",
} satisfies ToolDisplay<PayloadBlobRangeReadInput, PayloadBlobRangeReadValue>;

export const PayloadBlobRangeRead = tool({
  description:
    "Read a character range from a payload blob. Use this when tool outputs were trimmed and replaced with a message like 'Read output from blob ID blob-xyz with PayloadBlobRangeRead'. Supports pagination with offset and limit to avoid loading large blobs into context at once.",
  inputSchema,
  outputSchema,
  execute: ({ blobId, offset, limit }, { experimental_context }): PayloadBlobRangeReadOutput => {
    const context = experimental_context as AgentContext;
    const content = context.getPayloadBlob(blobId);

    if (content === undefined) {
      return ToolResult.err(
        "Blob not found",
        `Blob "${blobId}" was not found. It may have been from a previous run or expired.`
      );
    }

    const safeOffset = offset ?? 0;
    if (safeOffset >= content.length) {
      return ToolResult.err(
        "Offset out of bounds",
        `Offset ${safeOffset} exceeds blob length ${content.length}`
      );
    }

    const safeLimit = limit ?? DEFAULT_LIMIT;
    const result = readBlobRange(content, safeOffset, safeLimit);

    return ToolResult.ok({
      message: `Read ${result.content.length} chars from blob`,
      ...result,
    });
  },
});
