import { tool } from "ai";
import { z } from "zod";

import { useConfigStore } from "@/stores/config";

const UpdateLearningSchema = z.object({
  index: z
    .number()
    .int()
    .nonnegative()
    .describe("Zero-based index of the learning entry to replace."),
  content: z
    .string()
    .min(1)
    .describe(
      "The new content for the learning entry. Provide the full replacement text.",
    ),
});

export const updateLearningTool = tool({
  description: `Modify an existing learning entry by index. Use this to correct or refine previously stored information.`,
  inputSchema: UpdateLearningSchema,
  execute: async ({ index, content }) => {
    const configStore = useConfigStore();
    const learnings = configStore.learnings;

    if (index < 0 || index >= learnings.length) {
      return {
        error: `Learning index ${index} is out of range. Current learnings length: ${learnings.length}.`,
      };
    }

    await configStore.updateLearning(index, content);

    return {
      message: `Learning #${index} updated.`,
      learning: {
        index,
        value: content,
      },
    };
  },
});

