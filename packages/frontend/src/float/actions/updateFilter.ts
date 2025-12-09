import { tool } from "ai";
import { z } from "zod";

import { actionError, actionSuccess } from "@/float/actionUtils";
import { type FloatToolContext } from "@/float/types";

const InputSchema = z.object({
  id: z.string().describe("ID of the filter to update (non-empty)"),
  filterName: z.string().describe("New name for the filter (non-empty)"),
  alias: z.string().describe("New alias for the filter (non-empty)"),
  query: z.string().describe("New HTTPQL query for the filter (non-empty)"),
});

export const updateFilterTool = tool({
  description:
    "Update an existing filter by ID with new name, alias, and query",
  inputSchema: InputSchema,
  execute: async (
    { id, filterName, alias, query },
    { experimental_context },
  ) => {
    const { sdk } = experimental_context as FloatToolContext;
    try {
      await sdk.filters.update(id, { name: filterName, alias, query });
    } catch (error) {
      return actionError("Failed to update filter", error);
    }

    return actionSuccess(`Filter ${id} updated successfully`);
  },
});
