import { z } from "zod";

import { actionError, actionSuccess } from "@/float/actionUtils";
import { type ActionDefinition } from "@/float/types";
import { useConfigStore } from "@/stores/config";

export const removeLearningsSchema = z.object({
  name: z.literal("removeLearnings"),
  parameters: z.object({
    indexes: z
      .array(
        z
          .number()
          .describe(
            "Zero-based index of a learning entry to remove (integer, >= 0).",
          ),
      )
      .describe("One or more learning indexes to delete (non-empty array)."),
  }),
});

export type RemoveLearningsInput = z.infer<typeof removeLearningsSchema>;

export const removeLearnings: ActionDefinition<RemoveLearningsInput> = {
  name: "removeLearnings",
  description:
    "Delete one or more project learning entries by their zero-based index.",
  inputSchema: removeLearningsSchema,
  execute: async (_sdk, { indexes }) => {
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
};
