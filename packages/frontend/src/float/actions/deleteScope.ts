import { z } from "zod";

import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

export const deleteScopeSchema = z.object({
  name: z.literal("deleteScope"),
  parameters: z.object({
    id: z
      .string()
      .min(1)
      .describe(
        "The ID of the scope to delete. This must be a number in a string.",
      ),
  }),
});

export type DeleteScopeInput = z.infer<typeof deleteScopeSchema>;

export const deleteScope: ActionDefinition<DeleteScopeInput> = {
  name: "deleteScope",
  description: "Delete a scope by id",
  inputSchema: deleteScopeSchema,
  execute: async (sdk: FrontendSDK, { id }: DeleteScopeInput["parameters"]) => {
    const deleted = await sdk.scopes.deleteScope(id);
    if (!deleted) {
      return {
        success: false,
        error: "Failed to delete scope",
      };
    }

    return {
      success: true,
      frontend_message: `Scope with ID ${id} deleted successfully`,
    };
  },
};
