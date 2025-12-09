import { z } from "zod";

import { runAction } from "@/float/actionUtils";
import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

const deleteFilterSchema = z.object({
  name: z.literal("deleteFilter"),
  parameters: z.object({
    id: z.string().describe("ID of the filter to delete"),
  }),
});

type DeleteFilterInput = z.infer<typeof deleteFilterSchema>;

export const deleteFilter: ActionDefinition<DeleteFilterInput> = {
  name: "deleteFilter",
  description: "Delete a filter by ID",
  inputSchema: deleteFilterSchema,
  execute: async (sdk: FrontendSDK, { id }: DeleteFilterInput["parameters"]) =>
    runAction(
      () => sdk.filters.delete(id),
      "Filter deleted successfully",
      "Failed to delete filter",
    ),
};
