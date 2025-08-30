import { z } from "zod";

import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

export const addScopeSchema = z.object({
  name: z.literal("addScope"),
  parameters: z.object({
    name: z.string().min(1).describe("The name of the scope."),
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
    { name, allowlist, denylist }: AddScopeInput["parameters"],
  ) => {
    const scope = await sdk.scopes.createScope({
      name,
      allowlist,
      denylist,
    });

    if (scope === undefined) {
      return {
        success: false,
        error: "Failed to create scope",
      };
    }

    return {
      success: true,
      frontend_message: `Scope ${scope.name} created successfully`,
    };
  },
};
