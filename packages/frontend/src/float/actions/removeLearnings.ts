import { tool } from "ai";
import { z } from "zod";

import { actionError, actionSuccess } from "@/float/actionUtils";
import { useConfigStore } from "@/stores/config";

const InputSchema = z.object({
  indexes: z
    .array(
      z
        .number()
        .describe(
          "Zero-based index of a learning entry to remove (integer, >= 0).",
        ),
    )
    .describe("One or more learning indexes to delete (non-empty array)."),
});

export const removeLearningsTool = tool({
  description:
    "Delete one or more project learning entries by their zero-based index.",
  inputSchema: InputSchema,
  execute: async ({ indexes }) => {
    try {
      const configStore = useConfigStore();
      const uniqueIndexes = [...new Set(indexes)].filter((index) => index >= 0);

      if (uniqueIndexes.length === 0) {
        return {
          success: false,
          error: "No valid learning indexes were provided.",
        };
      }

      await configStore.removeLearnings(uniqueIndexes);
      return actionSuccess(
        `Removed ${uniqueIndexes.length} learning${
          uniqueIndexes.length === 1 ? "" : "s"
        }.`,
      );
    } catch (error) {
      return actionError("Failed to remove learnings", error);
    }
  },
});
