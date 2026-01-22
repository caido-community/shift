import { tool } from "ai";
import { z } from "zod";

import { ActionResult, type FloatToolContext } from "@/float/types";

const inputSchema = z.object({
  scopeName: z.string().describe("The name of the scope (non-empty)."),
  allowlist: z.array(z.string()).describe("The allowlist of the scope. This can be empty."),
  denylist: z.array(z.string()).describe("The denylist of the scope. This can be empty."),
});

export const scopeAddTool = tool({
  description: "Create a new scope configuration",
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: async ({ scopeName, allowlist, denylist }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    const scope = await sdk.scopes.createScope({
      name: scopeName,
      allowlist,
      denylist,
    });

    if (scope === undefined) {
      return ActionResult.err("Failed to create scope");
    }

    return ActionResult.ok(`Scope ${scope.name} created successfully`);
  },
});
