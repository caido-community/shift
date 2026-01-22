import { tool } from "ai";
import { z } from "zod";

import { ActionResult, type FloatToolContext } from "@/float/types";

const inputSchema = z.object({
  id: z.string().describe("ID of the filter to delete"),
});

export const filterDeleteTool = tool({
  description: "Delete a filter by ID",
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: async ({ id }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;

    try {
      await sdk.filters.delete(id);
      return ActionResult.ok("Filter deleted successfully");
    } catch (error) {
      return ActionResult.err(
        "Failed to delete filter",
        error instanceof Error ? error.message : undefined
      );
    }
  },
});
