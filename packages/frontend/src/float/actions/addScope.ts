import { z } from "zod";

import { actionError, actionSuccess } from "@/float/actionUtils";
import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

export const addScopeSchema = z.object({
  name: z.literal("addScope"),
  parameters: z.object({
    scopeName: z.string().describe("The name of the scope (non-empty)."),
    allowlist: z
      .array(z.string())
      .describe("The allowlist of the scope. This can be empty."),
    denylist: z
      .array(z.string())
      .describe("The denylist of the scope. This can be empty."),
  }),
});

export type AddScopeInput = z.infer<typeof addScopeSchema>;

export const addScope: ActionDefinition<AddScopeInput> = {
  name: "addScope",
  description: "Create a new scope configuration",
  inputSchema: addScopeSchema,
  execute: async (
    sdk: FrontendSDK,
    { scopeName, allowlist, denylist }: AddScopeInput["parameters"],
  ) => {
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
};
