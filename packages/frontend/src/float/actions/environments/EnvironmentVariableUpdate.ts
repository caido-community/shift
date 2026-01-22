import { tool } from "ai";
import { z } from "zod";

import { ActionResult, type FloatToolContext } from "@/float/types";
import { normalizeEnvironmentVariable, resolveEnvironment } from "@/float/utils";
import { type NormalizedEnvironmentVariable } from "@/float/utils";
import { isPresent } from "@/utils";

const environmentVariableSchema = z.object({
  name: z
    .string()
    .describe("The name of the environment variable to create or update (non-empty)."),
  value: z.string().describe("The value assigned to the environment variable."),
  kind: z.string().describe("The kind of the environment variable. Use PLAIN if not specified."),
});

const inputSchema = z.object({
  environmentId: z
    .string()
    .nullable()
    .describe(
      "The ID of the environment to update. Use null to default to the selected environment, or Global if none selected."
    ),
  variable: environmentVariableSchema,
});

export const environmentVariableUpdateTool = tool({
  description:
    "Create or update a variable in an environment by id (defaults to the selected environment, or Global if none selected)",
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: async ({ environmentId, variable }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    const environment = await resolveEnvironment(sdk, environmentId ?? undefined);

    if (!isPresent(environment)) {
      return ActionResult.err("Unable to resolve environment to update");
    }

    const variables = environment.variables.reduce<NormalizedEnvironmentVariable[]>(
      (acc, existingVariable) => {
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
            kind: typeof existingVariable.kind === "string" ? existingVariable.kind : undefined,
          })
        );

        return acc;
      },
      []
    );

    const normalizedVariable = normalizeEnvironmentVariable({
      name: variable.name,
      value: variable.value,
      kind: variable.kind,
    });
    const index = variables.findIndex(
      (existingVariable) => existingVariable.name === variable.name
    );

    if (index >= 0) {
      variables[index] = normalizedVariable;
    } else {
      variables.push(normalizedVariable);
    }

    try {
      await sdk.graphql.updateEnvironment({
        id: environment.id,
        input: {
          name: environment.name,
          version: environment.version,
          variables,
        },
      });

      return ActionResult.ok(`Variable ${variable.name} updated successfully`);
    } catch (error) {
      return ActionResult.err(
        "Failed to update environment variable",
        error instanceof Error ? error.message : undefined
      );
    }
  },
});
