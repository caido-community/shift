import { tool } from "ai";
import { z } from "zod";

import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { useLearningsStore } from "@/stores/learnings";
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
  outputSchema: ToolResult.schema(valueSchema),
  execute: async ({ indexes }): Promise<LearningRemoveOutput> => {
    const store = useLearningsStore();
    const { entries } = store;
    const uniqueIndexes = [...new Set(indexes)];

    const outOfRange = uniqueIndexes.filter((index) => index >= entries.length);
    if (outOfRange.length > 0) {
      return ToolResult.err(
        `Learning ${pluralize(outOfRange.length, "index", "indexes")} ${outOfRange.join(", ")} out of range.`,
        `Current learnings count: ${entries.length}`
      );
    }

    const result = await store.remove(uniqueIndexes);
    if (result.kind === "Error") {
      return ToolResult.err("Failed to remove learnings", result.error);
    }

    return ToolResult.ok({
      message: `Removed ${uniqueIndexes.length} ${pluralize(uniqueIndexes.length, "learning")}.`,
      removedIndexes: uniqueIndexes,
    });
  },
});
