import { tool } from "ai";
import { z } from "zod";

import { ActionResult } from "@/float/types";
import { useLearningsStore } from "@/stores/learnings";
import { updateLearning } from "@/stores/learnings/store.effects";

const inputSchema = z.object({
  index: z.number().describe("Zero-based index of the learning entry to update (integer, >= 0)."),
  content: z
    .string()
    .describe("The complete replacement text for the selected learning entry (non-empty)."),
});

export const learningUpdateTool = tool({
  description: `
    Replace the content of an existing project learning entry by its index.
    When updating a learning, you should provide the complete value, not a summary.
    Make this learning concise, but informative for yourself in the future to understand things about the target.
    When possible, specify which domain/api/etc is the subject of the learning.
    `,
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: async ({ index, content }) => {
    const { sdk, dispatch, entries } = useLearningsStore();

    if (index < 0 || index >= entries.length) {
      return ActionResult.err(`Learning index ${index} is out of range.`);
    }

    await updateLearning(sdk, dispatch, { index, content });
    return ActionResult.ok(`Learning #${index} updated successfully.`);
  },
});
