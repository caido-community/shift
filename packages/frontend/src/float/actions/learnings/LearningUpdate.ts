import { tool } from "ai";
import { z } from "zod";

import { ToolResult } from "@/agent/types";
import { useLearningsStore } from "@/stores/learnings";

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
  outputSchema: ToolResult.schema(),
  execute: async ({ index, content }) => {
    const store = useLearningsStore();
    const { entries } = store;

    if (index < 0 || index >= entries.length) {
      return ToolResult.err(`Learning index ${index} is out of range.`);
    }

    const result = await store.update(index, content);
    if (result.kind === "Error") {
      return ToolResult.err("Failed to update learning", result.error);
    }
    return ToolResult.ok({ message: `Learning #${index} updated successfully.` });
  },
});
