import { z } from "zod";

import { actionError, actionSuccess } from "@/float/actionUtils";
import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

export const deleteEnvironmentSchema = z.object({
  name: z.literal("deleteEnvironment"),
  parameters: z.object({
    id: z
      .string()
      .min(1)
      .describe("ID of the environment that should be deleted."),
  }),
});

export type DeleteEnvironmentInput = z.infer<typeof deleteEnvironmentSchema>;

export const deleteEnvironment: ActionDefinition<DeleteEnvironmentInput> = {
  name: "deleteEnvironment",
  description: "Delete an existing environment by id",
  inputSchema: deleteEnvironmentSchema,
  execute: async (
    sdk: FrontendSDK,
    { id }: DeleteEnvironmentInput["parameters"],
  ) => {
    try {
      await sdk.graphql.deleteEnvironment({ id });

      return actionSuccess(`Environment ${id} deleted successfully`);
    } catch (error) {
      return actionError("Failed to delete environment", error);
    }
  },
};
