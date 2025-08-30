import { z } from "zod";

import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

export const addFilterSchema = z.object({
  name: z.literal("addFilter"),
  parameters: z.object({
    name: z.string().min(1).describe("Name of the filter"),
    query: z.string().min(1).describe("HTTPQL query for the filter"),
    alias: z.string().min(1).describe("Alias for the filter"),
  }),
});

export type AddFilterInput = z.infer<typeof addFilterSchema>;
export const addFilter: ActionDefinition<AddFilterInput> = {
  name: "addFilter",
  description: "Create a new filter with specified name, query, and alias",
  inputSchema: addFilterSchema,
  execute: async (
    sdk: FrontendSDK,
    { name, query, alias }: AddFilterInput["parameters"],
  ) => {
    try {
      const newFilter = await sdk.filters.create({ name, query, alias });
      if (newFilter === undefined) {
        return {
          success: false,
          error: "Failed to create filter",
        };
      }

      return {
        success: true,
        frontend_message: `Filter ${name} created successfully`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create filter: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
};
