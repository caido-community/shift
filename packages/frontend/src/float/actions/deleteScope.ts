import { tool } from "ai";
import { z } from "zod";

import { actionError, actionSuccess } from "@/float/actionUtils";
import { type FloatToolContext } from "@/float/types";

const InputSchema = z.object({
  id: z
    .string()
    .describe(
      "The ID of the scope to delete (non-empty). This must be a number in a string.",
    ),
});

export const deleteScopeTool = tool({
  description: "Delete a scope by id",
  inputSchema: InputSchema,
  execute: async ({ id }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
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
});
