import { z } from "zod";

import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

export const updateFilterSchema = z.object({
  name: z.literal("updateFilter"),
  parameters: z.object({
    id: z.string().min(1).describe("ID of the filter to update"),
    name: z.string().min(1).describe("New name for the filter"),
    alias: z.string().min(1).describe("New alias for the filter"),
    query: z.string().min(1).describe("New HTTPQL query for the filter"),
  }),
});

export type UpdateFilterInput = z.infer<typeof updateFilterSchema>;

export const updateFilter: ActionDefinition<UpdateFilterInput> = {
  name: "updateFilter",
  description:
    "Update an existing filter by ID with new name, alias, and query",
  inputSchema: updateFilterSchema,
  execute: async (
    sdk: FrontendSDK,
    { id, name, alias, query }: UpdateFilterInput["parameters"],
  ) => {
    try {
      await sdk.filters.update(id, { name, alias, query });
    } catch (error) {
      return {
        success: false,
        error: `Failed to update filter: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }

    return {
      success: true,
      frontend_message: `Filter ${id} updated successfully`,
    };
  },
};
