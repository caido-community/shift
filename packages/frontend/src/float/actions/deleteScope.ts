import { z } from "zod";

import { actionError, actionSuccess } from "@/float/actionUtils";
import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

const deleteScopeSchema = z.object({
  name: z.literal("deleteScope"),
  parameters: z.object({
    id: z
      .string()
      .describe(
        "The ID of the scope to delete (non-empty). This must be a number in a string.",
      ),
  }),
});

type DeleteScopeInput = z.infer<typeof deleteScopeSchema>;

export const deleteScope: ActionDefinition<DeleteScopeInput> = {
  name: "deleteScope",
  description: "Delete a scope by id",
  inputSchema: deleteScopeSchema,
  execute: async (sdk: FrontendSDK, { id }: DeleteScopeInput["parameters"]) => {
    try {
      const deleted = await sdk.scopes.deleteScope(id);
      if (!deleted) {
        return {
          success: false,
          error: "Failed to delete scope",
        };
      }

      return actionSuccess(`Scope with ID ${id} deleted successfully`);
    } catch (error) {
      return actionError("Failed to delete scope", error);
    }
  },
};
