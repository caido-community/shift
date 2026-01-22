import { tool } from "ai";
import { z } from "zod";

import { ActionResult } from "@/float/types";
import { useLearningsStore } from "@/stores/learnings";
import { removeLearnings } from "@/stores/learnings/store.effects";

const inputSchema = z.object({
  indexes: z
    .array(z.number().describe("Zero-based index of a learning entry to remove (integer, >= 0)."))
    .describe("One or more learning indexes to delete (non-empty array)."),
});

export const learningsRemoveTool = tool({
  description: "Delete one or more project learning entries by their zero-based index.",
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: async ({ indexes }) => {
    const { sdk, dispatch } = useLearningsStore();
    const uniqueIndexes = [...new Set(indexes)].filter((index) => index >= 0);

    if (uniqueIndexes.length === 0) {
      return ActionResult.err("No valid learning indexes were provided.");
    }

    await removeLearnings(sdk, dispatch, { indexes: uniqueIndexes });
    return ActionResult.ok(
      `Removed ${uniqueIndexes.length} learning${uniqueIndexes.length === 1 ? "" : "s"}.`
    );
  },
});
