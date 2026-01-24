import { tool } from "ai";
import { z } from "zod";

import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { useLearningsStore } from "@/stores/learnings";
import { removeLearnings } from "@/stores/learnings/store.effects";
import { pluralize } from "@/utils";

const inputSchema = z.object({
  indexes: z
    .array(z.number().int().nonnegative())
    .min(1)
    .describe("List of zero-based learning indexes to delete."),
});

const valueSchema = z.object({
  removedIndexes: z.array(z.number()),
});

const outputSchema = ToolResult.schema(valueSchema);

type LearningRemoveInput = z.infer<typeof inputSchema>;
type LearningRemoveValue = z.infer<typeof valueSchema>;
type LearningRemoveOutput = ToolResultType<LearningRemoveValue>;

export const display = {
  streaming: ({ input }) => [
    { text: "Removing " },
    {
      text: input?.indexes
        ? `${input.indexes.length} ${pluralize(input.indexes.length, "learning")}`
        : "learnings",
      muted: true,
    },
  ],
  success: ({ output }) => [
    { text: "Removed " },
    {
      text: output?.removedIndexes
        ? `${output.removedIndexes.length} ${pluralize(output.removedIndexes.length, "learning")}`
        : "learnings",
      muted: true,
    },
  ],
  error: () => "Failed to remove learnings",
} satisfies ToolDisplay<LearningRemoveInput, LearningRemoveValue>;

export const LearningRemove = tool({
  description:
    "Delete one or more learning entries from the project's persistent memory by their zero-based index. Use this to remove outdated information (expired tokens, rotated credentials), incorrect learnings, or entries that are no longer relevant. Accepts an array of indexes to remove multiple entries at once. The indexes correspond to the positions shown in the learnings list - be careful as removing entries will shift the indexes of subsequent entries. Returns the list of indexes that were successfully removed.",
  inputSchema,
  outputSchema,
  execute: async ({ indexes }): Promise<LearningRemoveOutput> => {
    const { sdk, dispatch } = useLearningsStore();
    const uniqueIndexes = [...new Set(indexes)].filter((index) => index >= 0);

    if (uniqueIndexes.length === 0) {
      return ToolResult.err("No valid learning indexes were provided.");
    }

    await removeLearnings(sdk, dispatch, { indexes: uniqueIndexes });

    return ToolResult.ok({
      message: `Removed ${uniqueIndexes.length} ${pluralize(uniqueIndexes.length, "learning")}.`,
      removedIndexes: uniqueIndexes,
    });
  },
});
