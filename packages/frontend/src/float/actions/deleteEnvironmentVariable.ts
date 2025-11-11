import { z } from "zod";

import {
  actionError,
  actionSuccess,
  resolveEnvironment,
} from "@/float/actionUtils";
import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

export const deleteEnvironmentVariableSchema = z.object({
  name: z.literal("deleteEnvironmentVariable"),
  parameters: z.object({
    environmentId: z
      .string()
      .optional()
      .describe(
        "The ID of the environment to update. Defaults to the selected environment, or Global if none selected.",
      ),
    variableName: z
      .string()
      .min(1)
      .describe("The name of the variable that should be deleted."),
  }),
});

export type DeleteEnvironmentVariableInput = z.infer<
  typeof deleteEnvironmentVariableSchema
>;

export const deleteEnvironmentVariable: ActionDefinition<DeleteEnvironmentVariableInput> =
  {
    name: "deleteEnvironmentVariable",
    description:
      "Delete an environment variable from the selected environment (or Global by default)",
    inputSchema: deleteEnvironmentVariableSchema,
    execute: async (
      sdk: FrontendSDK,
      {
        environmentId,
        variableName,
      }: DeleteEnvironmentVariableInput["parameters"],
    ) => {
      try {
        const environment = await resolveEnvironment(sdk, environmentId);

        if (environment === undefined) {
          return {
            success: false,
            error: "Unable to resolve environment to update",
          };
        }

        const variables = [...(environment.variables ?? [])];
        const index = variables.findIndex(
          (existingVariable) => existingVariable.name === variableName,
        );

        if (index === -1) {
          return {
            success: false,
            error: `Variable ${variableName} not found`,
          };
        }

        variables.splice(index, 1);

        await sdk.graphql.updateEnvironment({
          id: environment.id,
          input: {
            name: environment.name,
            version: environment.version,
            variables,
          },
        });

        return actionSuccess(`Variable ${variableName} deleted successfully`);
      } catch (error) {
        return actionError("Failed to delete environment variable", error);
      }
    },
  };
