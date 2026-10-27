import { tool } from "ai";
import { z } from "zod";

import { ToolResult } from "@/agent/types";
import { useLearningsStore } from "@/stores/learnings";

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
  outputSchema: ToolResult.schema(),
  execute: async ({ content }) => {
    const result = await useLearningsStore().add(content);
    if (result.kind === "Error") {
      return ToolResult.err("Failed to add learning", result.error);
    }
    return ToolResult.ok({ message: "Learning added to project memory." });
  },
});
