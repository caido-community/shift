import { tool } from "ai";
import { z } from "zod";

import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { useLearningsStore } from "@/stores/learnings";

const DEFAULT_LIMIT = 8000;
const MAX_LIMIT = 20000;

type LearningReadValue = {
  index: number;
  content: string;
  offset: number;
  endOffset: number;
  learningLength: number;
  hasMore: boolean;
};

export function readLearningRange(content: string, offset: number, limit: number) {
  const safeOffset = Math.max(0, offset);
  const safeLimit = Math.max(1, Math.min(limit, MAX_LIMIT));
  const endOffset = Math.min(content.length, safeOffset + safeLimit);

  return {
    content: content.slice(safeOffset, endOffset),
    offset: safeOffset,
    endOffset,
    hasMore: endOffset < content.length,
  };
}

const inputSchema = z.object({
  index: z.number().int().nonnegative().describe("Zero-based learning index to read."),
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
  index: z.number(),
  content: z.string(),
  offset: z.number(),
  endOffset: z.number(),
  learningLength: z.number(),
  hasMore: z.boolean(),
});

const outputSchema = ToolResult.schema(valueSchema);

type LearningReadInput = z.infer<typeof inputSchema>;
type LearningReadOutput = ToolResultType<LearningReadValue>;

export const display = {
  streaming: ({ input }) => [
    { text: "Reading learning " },
    { text: input?.index !== undefined ? `#${input.index}` : "...", muted: true },
  ],
  success: ({ output }) => [
    { text: "Read learning " },
    { text: output?.index !== undefined ? `#${output.index}` : "entry", muted: true },
    { text: output !== undefined ? ` (${output.endOffset - output.offset} chars)` : "" },
    ...(output?.hasMore === true ? [{ text: " (more available)" }] : []),
  ],
  error: ({ input }) =>
    input?.index !== undefined
      ? `Failed to read learning #${input.index}`
      : "Failed to read learning",
} satisfies ToolDisplay<LearningReadInput, LearningReadValue>;

export const LearningRead = tool({
  description:
    "Read the full or partial content of a persistent learning entry by its zero-based index. Use this when the context only shows a preview of a learning and you need the exact stored value before relying on it. Supports pagination with offset and limit for long entries.",
  inputSchema,
  outputSchema,
  execute: ({ index, offset, limit }): LearningReadOutput => {
    const entries = useLearningsStore().entries;
    const learning = entries[index];

    if (learning === undefined) {
      return ToolResult.err(
        `Learning index ${index} is out of range.`,
        `Current learnings count: ${entries.length}`
      );
    }

    const safeOffset = offset ?? 0;
    if (safeOffset >= learning.length) {
      return ToolResult.err(
        "Offset out of bounds",
        `Offset ${safeOffset} exceeds learning length ${learning.length}`
      );
    }

    const result = readLearningRange(learning, safeOffset, limit ?? DEFAULT_LIMIT);

    return ToolResult.ok({
      message: `Read ${result.content.length} chars from learning #${index}.`,
      index,
      ...result,
      learningLength: learning.length,
    });
  },
});
