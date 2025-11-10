import { z } from "zod";

import { actionError, actionSuccess } from "@/float/actionUtils";
import { type ActionDefinition } from "@/float/types";
import { useConfigStore } from "@/stores/config";

export const updateLearningSchema = z.object({
  name: z.literal("updateLearning"),
  parameters: z.object({
    index: z
      .number()
      .int()
      .nonnegative()
      .describe("Zero-based index of the learning entry to update."),
    content: z
      .string()
      .min(1)
      .describe(
        "The complete replacement text for the selected learning entry.",
      ),
  }),
});

export type UpdateLearningInput = z.infer<typeof updateLearningSchema>;

export const updateLearning: ActionDefinition<UpdateLearningInput> = {
  name: "updateLearning",
  description:`
    Replace the content of an existing project learning entry by its index.
    When updating a learning, you should provide the complete value, not a summary.
    Make this learning concise, but informative for yourself in the future to understand things about the target.
    When possible, specify which domain/api/etc is the subject of the learning.
    `,
  inputSchema: updateLearningSchema,
  execute: async (_sdk, { index, content }) => {
    try {
      const configStore = useConfigStore();
      const currentLearnings = configStore.learnings;

      if (index < 0 || index >= currentLearnings.length) {
        return {
          success: false,
          error: `Learning index ${index} is out of range.`,
        };
      }

      await configStore.updateLearning(index, content);
      return actionSuccess(`Learning #${index} updated successfully.`);
    } catch (error) {
      return actionError("Failed to update learning", error);
    }
  },
};

