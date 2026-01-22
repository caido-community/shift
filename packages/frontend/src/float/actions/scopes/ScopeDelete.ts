import { tool } from "ai";
import { z } from "zod";

import { ActionResult, type FloatToolContext } from "@/float/types";

const inputSchema = z.object({
  id: z
    .string()
    .describe("The ID of the scope to delete (non-empty). This must be a number in a string."),
});

export const scopeDeleteTool = tool({
  description: "Delete a scope by id",
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: async ({ id }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    const deleted = await sdk.scopes.deleteScope(id);
    if (!deleted) {
      return ActionResult.err("Failed to delete scope");
    }

    return ActionResult.ok(`Scope with ID ${id} deleted successfully`);
  },
});
