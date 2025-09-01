import { z } from "zod";

import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

export const deleteFilterSchema = z.object({
  name: z.literal("deleteFilter"),
  parameters: z.object({
    id: z.string().describe("ID of the filter to delete"),
  }),
});

export type DeleteFilterInput = z.infer<typeof deleteFilterSchema>;

export const deleteFilter: ActionDefinition<DeleteFilterInput> = {
  name: "deleteFilter",
  description: "Delete a filter by ID",
  inputSchema: deleteFilterSchema,
  execute: async (
    sdk: FrontendSDK,
    { id }: DeleteFilterInput["parameters"],
  ) => {
    try {
      await sdk.filters.delete(id);

      return {
        success: true,
        frontend_message: "Filter deleted successfully",
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete filter: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
};
