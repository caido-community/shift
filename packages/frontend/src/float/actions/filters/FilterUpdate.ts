import { tool } from "ai";
import { z } from "zod";

import { ActionResult, type FloatToolContext } from "@/float/types";

const inputSchema = z.object({
  id: z.string().describe("ID of the filter to update (non-empty)"),
  filterName: z.string().describe("New name for the filter (non-empty)"),
  alias: z.string().describe("New alias for the filter (non-empty)"),
  query: z.string().describe("New HTTPQL query for the filter (non-empty)"),
});

export const filterUpdateTool = tool({
  description: "Update an existing filter by ID with new name, alias, and query",
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: async ({ id, filterName, alias, query }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;

    try {
      await sdk.filters.update(id, { name: filterName, alias, query });
      return ActionResult.ok(`Filter ${id} updated successfully`);
    } catch (error) {
      return ActionResult.err(
        "Failed to update filter",
        error instanceof Error ? error.message : undefined
      );
    }
  },
});
