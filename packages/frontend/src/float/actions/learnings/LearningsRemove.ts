import { tool } from "ai";
import { z } from "zod";

import { ToolResult } from "@/agent/types";
import { useLearningsStore } from "@/stores/learnings";

const inputSchema = z.object({
  indexes: z
    .array(z.number().describe("Zero-based index of a learning entry to remove (integer, >= 0)."))
    .describe("One or more learning indexes to delete (non-empty array)."),
});

export const learningsRemoveTool = tool({
  description: "Delete one or more project learning entries by their zero-based index.",
  inputSchema,
  outputSchema: ToolResult.schema(),
  execute: async ({ indexes }) => {
    const uniqueIndexes = [...new Set(indexes)].filter((index) => index >= 0);

    if (uniqueIndexes.length === 0) {
      return ToolResult.err("No valid learning indexes were provided.");
    }

    const result = await useLearningsStore().remove(uniqueIndexes);
    if (result.kind === "Error") {
      return ToolResult.err("Failed to remove learnings", result.error);
    }
    return ToolResult.ok({
      message: `Removed ${uniqueIndexes.length} learning${uniqueIndexes.length === 1 ? "" : "s"}.`,
    });
  },
});
