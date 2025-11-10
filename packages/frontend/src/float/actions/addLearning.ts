import { z } from "zod";

import { actionError, actionSuccess } from "@/float/actionUtils";
import { type ActionDefinition } from "@/float/types";
import { useConfigStore } from "@/stores/config";

export const addLearningSchema = z.object({
  name: z.literal("addLearning"),
  parameters: z.object({
    content: z
      .string()
      .min(1)
      .describe(
        "The full text of the learning to store. Provide the complete value, not a summary.",
      ),
  }),
});

export type AddLearningInput = z.infer<typeof addLearningSchema>;

export const addLearning: ActionDefinition<AddLearningInput> = {
  name: "addLearning",
  description: `
  Store a new project learning entry for future reference. 
  When adding a learning, summarize the takeaway of what the user provided. 
  Make this learning concise, but informative for yourself in the future to understand things about the target.
  When possible, specify which domain/api/etc is the subject of the learning.
  `,
  inputSchema: addLearningSchema,
  execute: async (_sdk, { content }) => {
    try {
      const configStore = useConfigStore();
      await configStore.addLearning(content);

      return actionSuccess("Learning added to project memory.");
    } catch (error) {
      return actionError("Failed to add learning", error);
    }
  },
};

