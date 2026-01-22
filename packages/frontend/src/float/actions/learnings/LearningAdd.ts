import { tool } from "ai";
import { z } from "zod";

import { ActionResult } from "@/float/types";
import { useLearningsStore } from "@/stores/learnings";
import { addLearning } from "@/stores/learnings/store.effects";

const inputSchema = z.object({
  content: z
    .string()
    .describe(
      "The full text of the learning to store (non-empty). Provide the complete value, not a summary."
    ),
});

export const learningAddTool = tool({
  description: `
  Store a new project learning entry for future reference.
  When adding a learning, summarize the takeaway of what the user provided.
  Make this learning concise, but informative for yourself in the future to understand things about the target.
  When possible, specify which domain/api/etc is the subject of the learning.
  `,
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: async ({ content }) => {
    const { sdk, dispatch } = useLearningsStore();
    await addLearning(sdk, dispatch, { content });
    return ActionResult.ok("Learning added to project memory.");
  },
});
