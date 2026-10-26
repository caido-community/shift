import { tool } from "ai";
import { z } from "zod";

import { readTextRange } from "@/agent/tools/utils/range";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { useLearningsStore } from "@/stores/learnings";

const DEFAULT_LIMIT = 8000;
const MAX_LIMIT = 20000;

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

type LearningReadInput = z.infer<typeof inputSchema>;
type LearningReadValue = z.infer<typeof valueSchema>;
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
  outputSchema: ToolResult.schema(valueSchema),
  execute: ({ index, offset = 0, limit = DEFAULT_LIMIT }): LearningReadOutput => {
    const entries = useLearningsStore().entries;
    const learning = entries[index];

    if (learning === undefined) {
      return ToolResult.err(
        `Learning index ${index} is out of range.`,
        `Current learnings count: ${entries.length}`
      );
    }

    const range = readTextRange(learning, `learning #${index}`, offset, limit);
    if (range.kind === "Error") {
      return range;
    }
    return ToolResult.ok({ ...range.value, index, learningLength: learning.length });
  },
});
