import { tool } from "ai";
import { z } from "zod";

import { actionError, actionSuccess } from "@/float/actionUtils";
import { type FloatToolContext } from "@/float/types";

const InputSchema = z.object({
  id: z
    .string()
    .describe(
      "The ID of the scope to update (non-empty). This must be a number in a string.",
    ),
  scopeName: z.string().describe("The name of the scope (non-empty)"),
  allowlist: z
    .array(z.string())
    .describe("The allowlist of the scope. This can be empty."),
  denylist: z
    .array(z.string())
    .describe("The denylist of the scope. This can be empty."),
});

export const updateScopeTool = tool({
  description: "Update a scope by id",
  inputSchema: InputSchema,
  execute: async (
    { id, scopeName, allowlist, denylist },
    { experimental_context },
  ) => {
    const { sdk } = experimental_context as FloatToolContext;
    try {
      const updated = await sdk.scopes.updateScope(id, {
        name: scopeName,
        allowlist,
        denylist,
      });

      if (updated === undefined) {
        return {
          success: false,
          error: "Failed to update scope",
        };
      }

      return actionSuccess(`Scope ${updated.name} updated successfully`);
    } catch (error) {
      return actionError("Failed to update scope", error);
    }
  },
});
