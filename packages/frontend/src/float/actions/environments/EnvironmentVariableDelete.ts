import { tool } from "ai";
import { z } from "zod";

import { ActionResult, type FloatToolContext } from "@/float/types";
import { resolveEnvironment } from "@/float/utils";

const inputSchema = z.object({
  environmentId: z
    .string()
    .nullable()
    .describe(
      "The ID of the environment to update. Use null to default to the selected environment, or Global if none selected."
    ),
  variableName: z.string().describe("The name of the variable that should be deleted (non-empty)."),
});

export const environmentVariableDeleteTool = tool({
  description:
    "Delete an environment variable from the selected environment (or Global by default)",
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: async ({ environmentId, variableName }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    const environment = await resolveEnvironment(sdk, environmentId ?? undefined);

    if (environment === undefined) {
      return ActionResult.err("Unable to resolve environment to update");
    }

    const variables = [...(environment.variables ?? [])];
    const index = variables.findIndex((existingVariable) => existingVariable.name === variableName);

    if (index === -1) {
      return ActionResult.err(`Variable ${variableName} not found`);
    }

    variables.splice(index, 1);

    try {
      await sdk.graphql.updateEnvironment({
        id: environment.id,
        input: {
          name: environment.name,
          version: environment.version,
          variables,
        },
      });

      return ActionResult.ok(`Variable ${variableName} deleted successfully`);
    } catch (error) {
      return ActionResult.err(
        "Failed to delete environment variable",
        error instanceof Error ? error.message : undefined
      );
    }
  },
});
