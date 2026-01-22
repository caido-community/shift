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
  description: `Modify an existing learning entry by index. Use this to correct or refine previously stored information.`,
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
