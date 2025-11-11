import { tool } from "ai";
import { z } from "zod";

import { type ToolContext } from "@/agents/types";
import {
  fetchAgentEnvironments,
  findAgentEnvironment,
} from "@/agents/utils/environment";

const DeleteEnvironmentSchema = z
  .object({
    environmentId: z
      .string()
      .min(1)
      .optional()
      .describe("ID of the environment to delete."),
    environmentName: z
      .string()
      .min(1)
      .optional()
      .describe("Name of the environment to delete when the ID is unknown."),
  })
  .refine(
    (input) =>
      input.environmentId !== undefined || input.environmentName !== undefined,
    {
      message: "Provide environmentId or environmentName.",
      path: ["environmentId"],
    },
  );

export const deleteEnvironmentTool = tool({
  description: `Delete a Shift environment and all variables contained within it.`,
  inputSchema: DeleteEnvironmentSchema,
  execute: async (
    { environmentId, environmentName },
    { experimental_context },
  ) => {
    const context = experimental_context as ToolContext;
    const { sdk } = context;

    const environments = await fetchAgentEnvironments(sdk);
    const environment = findAgentEnvironment(environments, {
      id: environmentId,
      name: environmentName,
    });

    if (environment === undefined) {
      return {
        error: "Environment not found.",
      };
    }

    const resolvedEnvironmentId = environment.id.startsWith("name:")
      ? undefined
      : environment.id;

    if (resolvedEnvironmentId === undefined) {
      return {
        environment: {
          id: environment.id,
          name: environment.name,
        },
        error:
          "Unable to resolve environment ID. Try deleting it using its ID instead of name.",
      };
    }

    try {
      await sdk.graphql.deleteEnvironment({
        id: resolvedEnvironmentId,
      });

      return {
        environment: {
          id: resolvedEnvironmentId,
          name: environment.name,
        },
        message: "Environment deleted successfully.",
      };
    } catch (error) {
      return {
        environment: {
          id: resolvedEnvironmentId,
          name: environment.name,
        },
        error: `Failed to delete environment: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  },
});
