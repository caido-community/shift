import { z } from "zod";

import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

export const updateScopeSchema = z.object({
  name: z.literal("updateScope"),
  parameters: z.object({
    id: z
      .string()
      .min(1)
      .describe(
        "The ID of the scope to update. This must be a number in a string.",
      ),
    name: z.string().min(1).describe("The name of the scope"),
    allowlist: z
      .array(z.string())
      .describe("The allowlist of the scope. This can be empty."),
    denylist: z
      .array(z.string())
      .describe("The denylist of the scope. This can be empty."),
  }),
});

export type UpdateScopeInput = z.infer<typeof updateScopeSchema>;

export const updateScope: ActionDefinition<UpdateScopeInput> = {
  name: "updateScope",
  description: "Update a scope by id",
  inputSchema: updateScopeSchema,
  execute: async (
    sdk: FrontendSDK,
    { id, name, allowlist, denylist }: UpdateScopeInput["parameters"],
  ) => {
    const updated = await sdk.scopes.updateScope(id, {
      name,
      allowlist,
      denylist,
    });

    if (updated === undefined) {
      return {
        success: false,
        error: "Failed to update scope",
      };
    }

    return {
      success: true,
      frontend_message: `Scope ${updated.name} updated successfully`,
    };
  },
};
