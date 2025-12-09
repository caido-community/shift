import { tool } from "ai";
import { z } from "zod";

import { actionError, actionSuccess } from "@/float/actionUtils";
import { useConfigStore } from "@/stores/config";

const InputSchema = z.object({
  index: z
    .number()
    .describe(
      "Zero-based index of the learning entry to update (integer, >= 0).",
    ),
  content: z
    .string()
    .describe(
      "The complete replacement text for the selected learning entry (non-empty).",
    ),
});

export const updateLearningTool = tool({
  description: `
    Replace the content of an existing project learning entry by its index.
    When updating a learning, you should provide the complete value, not a summary.
    Make this learning concise, but informative for yourself in the future to understand things about the target.
    When possible, specify which domain/api/etc is the subject of the learning.
    `,
  inputSchema: InputSchema,
  execute: async ({ index, content }) => {
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
});
