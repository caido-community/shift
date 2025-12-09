import { z } from "zod";

import { actionError, actionSuccess } from "@/float/actionUtils";
import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

const updateFilterSchema = z.object({
  name: z.literal("updateFilter"),
  parameters: z.object({
    id: z.string().describe("ID of the filter to update (non-empty)"),
    filterName: z.string().describe("New name for the filter (non-empty)"),
    alias: z.string().describe("New alias for the filter (non-empty)"),
    query: z.string().describe("New HTTPQL query for the filter (non-empty)"),
  }),
});

type UpdateFilterInput = z.infer<typeof updateFilterSchema>;

export const updateFilter: ActionDefinition<UpdateFilterInput> = {
  name: "updateFilter",
  description:
    "Update an existing filter by ID with new name, alias, and query",
  inputSchema: updateFilterSchema,
  execute: async (
    sdk: FrontendSDK,
    { id, filterName, alias, query }: UpdateFilterInput["parameters"],
  ) => {
    try {
      await sdk.filters.update(id, { name: filterName, alias, query });
    } catch (error) {
      return actionError("Failed to update filter", error);
    }

    return actionSuccess(`Filter ${id} updated successfully`);
  },
};
