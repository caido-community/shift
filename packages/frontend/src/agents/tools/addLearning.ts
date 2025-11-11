import { tool } from "ai";
import { z } from "zod";

import { useConfigStore } from "@/stores/config";

const AddLearningSchema = z.object({
  content: z
    .string()
    .min(1)
    .describe(
      "The full text of the learning to persist. Include exact IDs, secrets, or notes as they should be recalled later.",
    ),
});

export const addLearningTool = tool({
  description: `Append a new learning entry to the project memory. Use this when you discover durable insights, IDs, credentials, or other data that future analysis should recall.`,
  inputSchema: AddLearningSchema,
  execute: async ({ content }) => {
    const configStore = useConfigStore();
    await configStore.addLearning(content);

    const learnings = configStore.learnings.map((value, index) => ({
      index,
      value,
    }));

    return {
      message: "Learning stored successfully.",
      learnings,
    };
  },
});
