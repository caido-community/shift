import { tool } from "ai";
import { z } from "zod";

import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { useLearningsStore } from "@/stores/learnings";
import { updateLearning } from "@/stores/learnings/store.effects";

const inputSchema = z.object({
  index: z
    .number()
    .int()
    .nonnegative()
    .describe("Zero-based index of the learning entry to replace."),
  content: z
    .string()
    .describe("The new content for the learning entry. Provide the full replacement text."),
});

const valueSchema = z.object({
  learning: z.object({ index: z.number(), value: z.string() }),
});

const outputSchema = ToolResult.schema(valueSchema);

type LearningUpdateInput = z.infer<typeof inputSchema>;
type LearningUpdateValue = z.infer<typeof valueSchema>;
type LearningUpdateOutput = ToolResultType<LearningUpdateValue>;

export const display = {
  streaming: ({ input }) => [
    { text: "Updating learning " },
    { text: input?.index !== undefined ? `#${input.index}` : "...", muted: true },
  ],
  success: ({ input }) => [
    { text: "Updated learning " },
    { text: input?.index !== undefined ? `#${input.index}` : "entry", muted: true },
  ],
  error: ({ input }) =>
    input?.index !== undefined
      ? `Failed to update learning #${input.index}`
      : "Failed to update learning",
} satisfies ToolDisplay<LearningUpdateInput, LearningUpdateValue>;

export const LearningUpdate = tool({
  description:
    "Replace the content of an existing learning entry at the specified zero-based index. Use this to correct mistakes, update outdated information (new token values, changed endpoints), or refine a learning with additional details. The entire content is replaced - provide the complete new text, not just the changes. The index must be valid (within the current learnings array bounds). Returns the updated learning entry with its index and new value.",
  inputSchema,
  outputSchema,
  execute: async ({ index, content }): Promise<LearningUpdateOutput> => {
    const { sdk, dispatch, entries } = useLearningsStore();

    if (index < 0 || index >= entries.length) {
      return ToolResult.err(
        `Learning index ${index} is out of range.`,
        `Current learnings count: ${entries.length}`
      );
    }

    await updateLearning(sdk, dispatch, { index, content });

    return ToolResult.ok({
      message: `Learning #${index} updated.`,
      learning: { index, value: content },
    });
  },
});
