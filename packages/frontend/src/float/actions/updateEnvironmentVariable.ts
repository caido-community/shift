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

const environmentVariableSchema = z.object({
  name: z
    .string()
    .min(1)
    .describe("The name of the environment variable to create or update."),
  value: z.string().describe("The value assigned to the environment variable."),
  kind: z
    .string()
    .min(1)
    .default("PLAIN")
    .describe(
      "The kind of the environment variable. Defaults to PLAIN when omitted.",
    ),
});

export const updateEnvironmentVariableSchema = z.object({
  name: z.literal("updateEnvironmentVariable"),
  parameters: z.object({
    environmentId: z
      .string()
      .optional()
      .describe(
        "The ID of the environment to update. Defaults to the selected environment, or Global if none selected.",
      ),
    variable: environmentVariableSchema,
  }),
});

export type UpdateEnvironmentVariableInput = z.infer<
  typeof updateEnvironmentVariableSchema
>;

export const updateEnvironmentVariable: ActionDefinition<
  UpdateEnvironmentVariableInput
> = {
  name: "updateEnvironmentVariable",
  description:
    "Create or update a variable in an environment by id (defaults to the selected environment, or Global if none selected)",
  inputSchema: updateEnvironmentVariableSchema,
  execute: async (
    sdk: FrontendSDK,
    {
      environmentId,
      variable,
    }: UpdateEnvironmentVariableInput["parameters"],
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
        (existingVariable) => existingVariable.name === variable.name,
      );

      const normalizedVariable = {
        name: variable.name,
        value: variable.value,
        kind: variable.kind ?? "PLAIN",
      };

      if (index >= 0) {
        variables[index] = normalizedVariable;
      } else {
        variables.push(normalizedVariable);
      }

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
        frontend_message: `Variable ${variable.name} updated successfully`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update environment variable: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
};

