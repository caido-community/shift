import { z } from "zod";

import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

const resolveEnvironment = async (sdk: FrontendSDK, environmentId?: string) => {
  if (environmentId !== undefined && environmentId.length > 0) {
    const environmentResult = await sdk.graphql.environment({ id: environmentId });
    return environmentResult?.environment ?? null;
  }

  const contextResult = await sdk.graphql.environmentContext();
  const contextEnvironment =
    contextResult?.environmentContext?.selected ??
    contextResult?.environmentContext?.global;

  if (
    contextEnvironment === undefined ||
    contextEnvironment === null ||
    contextEnvironment.id === undefined
  ) {
    return null;
  }

  const environmentResult = await sdk.graphql.environment({
    id: contextEnvironment.id,
  });

  return environmentResult?.environment ?? null;
};

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

export const deleteEnvironmentVariable: ActionDefinition<
  DeleteEnvironmentVariableInput
> = {
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

      if (environment === null) {
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
          version: (environment.version ?? 0) + 1,
          variables,
        },
      });

      return {
        success: true,
        frontend_message: `Variable ${variableName} deleted successfully`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete environment variable: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
};

