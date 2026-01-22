import { tool } from "ai";
import { z } from "zod";

import { ActionResult, type FloatToolContext } from "@/float/types";
import { isPresent } from "@/utils";

const inputSchema = z.object({
  id: z
    .string()
    .describe("The ID of the scope to update (non-empty). This must be a number in a string."),
  scopeName: z.string().describe("The name of the scope (non-empty)"),
  allowlist: z.array(z.string()).describe("The allowlist of the scope. This can be empty."),
  denylist: z.array(z.string()).describe("The denylist of the scope. This can be empty."),
});

export const scopeUpdateTool = tool({
  description: "Update a scope by id",
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: async ({ id, scopeName, allowlist, denylist }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    const updated = await sdk.scopes.updateScope(id, {
      name: scopeName,
      allowlist,
      denylist,
    });

    if (!isPresent(updated)) {
      return ActionResult.err("Failed to update scope");
    }

    return ActionResult.ok(`Scope ${updated.name} updated successfully`);
  },
});
