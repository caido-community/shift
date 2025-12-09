import { tool } from "ai";
import { z } from "zod";

import { actionError, actionSuccess } from "@/float/actionUtils";
import { useConfigStore } from "@/stores/config";

const InputSchema = z.object({
  content: z
    .string()
    .describe(
      "The full text of the learning to store (non-empty). Provide the complete value, not a summary.",
    ),
});

export const addLearningTool = tool({
  description: `
  Store a new project learning entry for future reference.
  When adding a learning, summarize the takeaway of what the user provided.
  Make this learning concise, but informative for yourself in the future to understand things about the target.
  When possible, specify which domain/api/etc is the subject of the learning.
  `,
  inputSchema: InputSchema,
  execute: async ({ content }) => {
    try {
      const configStore = useConfigStore();
      await configStore.addLearning(content);

      return actionSuccess("Learning added to project memory.");
    } catch (error) {
      return actionError("Failed to add learning", error);
    }
  },
});
