import { z } from "zod";

import {
  actionError,
  actionSuccess,
  normalizeEnvironmentVariable,
  resolveEnvironment,
} from "@/float/actionUtils";
import { type NormalizedEnvironmentVariable } from "@/float/actionUtils";
import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

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

export const updateEnvironmentVariable: ActionDefinition<UpdateEnvironmentVariableInput> =
  {
    name: "updateEnvironmentVariable",
    description:
      "Create or update a variable in an environment by id (defaults to the selected environment, or Global if none selected)",
    inputSchema: updateEnvironmentVariableSchema,
    execute: async (
      sdk: FrontendSDK,
      { environmentId, variable }: UpdateEnvironmentVariableInput["parameters"],
    ) => {
      try {
        const environment = await resolveEnvironment(sdk, environmentId);

        if (environment === undefined) {
          return {
            success: false,
            error: "Unable to resolve environment to update",
          };
        }

        const variables = (environment.variables ?? []).reduce<
          NormalizedEnvironmentVariable[]
        >((acc, existingVariable) => {
          if (
            existingVariable === null ||
            existingVariable === undefined ||
            typeof existingVariable.name !== "string" ||
            typeof existingVariable.value !== "string"
          ) {
            return acc;
          }

          acc.push(
            normalizeEnvironmentVariable({
              name: existingVariable.name,
              value: existingVariable.value,
              kind:
                typeof existingVariable.kind === "string"
                  ? existingVariable.kind
                  : undefined,
            }),
          );

          return acc;
        }, []);

        const normalizedVariable = normalizeEnvironmentVariable({
          name: variable.name,
          value: variable.value,
          kind: variable.kind,
        });
        const index = variables.findIndex(
          (existingVariable) => existingVariable.name === variable.name,
        );

        if (index >= 0) {
          variables[index] = normalizedVariable;
        } else {
          variables.push(normalizedVariable);
        }

        await sdk.graphql.updateEnvironment({
          id: environment.id,
          input: {
            name: environment.name,
            version: environment.version,
            variables,
          },
        });

        return actionSuccess(`Variable ${variable.name} updated successfully`);
      } catch (error) {
        return actionError("Failed to update environment variable", error);
      }
    },
  };
