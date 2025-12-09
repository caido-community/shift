import { tool } from "ai";
import { z } from "zod";

import { actionError, actionSuccess } from "@/float/actionUtils";
import { type FloatToolContext } from "@/float/types";

const InputSchema = z.object({
  scopeName: z.string().describe("The name of the scope (non-empty)."),
  allowlist: z
    .array(z.string())
    .describe("The allowlist of the scope. This can be empty."),
  denylist: z
    .array(z.string())
    .describe("The denylist of the scope. This can be empty."),
});

export const addScopeTool = tool({
  description: "Create a new scope configuration",
  inputSchema: InputSchema,
  execute: async (
    { scopeName, allowlist, denylist },
    { experimental_context },
  ) => {
    const { sdk } = experimental_context as FloatToolContext;
    try {
      const scope = await sdk.scopes.createScope({
        name: scopeName,
        allowlist,
        denylist,
      });

      if (scope === undefined) {
        return {
          success: false,
          error: "Failed to create scope",
        };
      }

      return actionSuccess(`Scope ${scope.name} created successfully`);
    } catch (error) {
      return actionError("Failed to create scope", error);
    }
  },
});
