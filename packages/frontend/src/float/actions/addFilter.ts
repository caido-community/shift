import { z } from "zod";

import { actionError, actionSuccess } from "@/float/actionUtils";
import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

const addFilterSchema = z.object({
  name: z.literal("addFilter"),
  parameters: z.object({
    filterName: z.string().describe("Name of the filter (non-empty)"),
    query: z.string().describe("HTTPQL query for the filter (non-empty)"),
    alias: z.string().describe("Alias for the filter (non-empty)"),
  }),
});

type AddFilterInput = z.infer<typeof addFilterSchema>;
export const addFilter: ActionDefinition<AddFilterInput> = {
  name: "addFilter",
  description: "Create a new filter with specified name, query, and alias",
  inputSchema: addFilterSchema,
  execute: async (
    sdk: FrontendSDK,
    { filterName, query, alias }: AddFilterInput["parameters"],
  ) => {
    try {
      const newFilter = await sdk.filters.create({
        name: filterName,
        query,
        alias,
      });
      if (newFilter === undefined) {
        return {
          success: false,
          error: "Failed to create filter",
        };
      }

      return actionSuccess(`Filter ${filterName} created successfully`);
    } catch (error) {
      return actionError("Failed to create filter", error);
    }
  },
};
