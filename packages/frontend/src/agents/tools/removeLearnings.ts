import { tool } from "ai";
import { z } from "zod";

import { useConfigStore } from "@/stores/config";

const RemoveLearningsSchema = z.object({
  indexes: z
    .array(
      z
        .number()
        .int()
        .nonnegative()
        .describe("Zero-based index of a learning entry to remove."),
    )
    .min(1)
    .describe("List of learning indexes to delete."),
});

export const removeLearningsTool = tool({
  description: `Delete one or more learning entries by their index. Use this to remove obsolete or incorrect memory items.`,
  inputSchema: RemoveLearningsSchema,
  execute: async ({ indexes }) => {
    const configStore = useConfigStore();
    const unique = [...new Set(indexes)].filter((index) => index >= 0);

    if (unique.length === 0) {
      return { error: "No valid learning indexes were provided." };
    }

    await configStore.removeLearnings(unique);

    return {
      message: `Removed ${unique.length} learning${
        unique.length === 1 ? "" : "s"
      }.`,
      removedIndexes: unique,
    };
  },
});

