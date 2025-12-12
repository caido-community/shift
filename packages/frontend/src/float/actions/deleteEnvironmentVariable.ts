import { tool } from "ai";
import { z } from "zod";

import {
  actionError,
  actionSuccess,
  resolveEnvironment,
} from "@/float/actionUtils";
import { type FloatToolContext } from "@/float/types";

const InputSchema = z.object({
  environmentId: z
    .string()
    .nullable()
    .describe(
      "The ID of the environment to update. Use null to default to the selected environment, or Global if none selected.",
    ),
  variableName: z
    .string()
    .describe("The name of the variable that should be deleted (non-empty)."),
});

export const deleteEnvironmentVariableTool = tool({
  description:
    "Delete an environment variable from the selected environment (or Global by default)",
  inputSchema: InputSchema,
  execute: async (
    { environmentId, variableName },
    { experimental_context },
  ) => {
    const { sdk } = experimental_context as FloatToolContext;
    try {
      const environment = await resolveEnvironment(
        sdk,
        environmentId ?? undefined,
      );

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
});
