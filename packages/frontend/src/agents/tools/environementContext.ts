import { tool } from "ai";
import { z } from "zod";

import {
  fetchAgentEnvironments,
  findAgentEnvironment,
  findAgentEnvironmentVariable,
} from "@/agents/utils/environment";
import { type ToolContext } from "@/agents/types";

const EnvironementContextSchema = z
  .object({
    environmentId: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Return a specific environment by its ID. When omitted, all environments are returned.",
      ),
    environmentName: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Return a specific environment by its name. When omitted, all environments are returned.",
      ),
    variableName: z
      .string()
      .min(1)
      .optional()
      .describe(
        "When provided alongside environmentId or environmentName, return only this variable.",
      ),
  })
  .refine(
    (input) =>
      input.variableName === undefined ||
      input.environmentId !== undefined ||
      input.environmentName !== undefined,
    {
      message:
        "Specify environmentId or environmentName when requesting a specific variable.",
      path: ["variableName"],
    },
  );

export const environementContextTool = tool({
  description: `Inspect Shift environments and their variables. Use this to discover existing environments, enumerate variables, or retrieve a single variable for use in other steps.`,
  inputSchema: EnvironementContextSchema,
  execute: async (
    { environmentId, environmentName, variableName },
    { experimental_context },
  ) => {
    const context = experimental_context as ToolContext;
    const { sdk } = context;

    const environments = await fetchAgentEnvironments(sdk);

    if (environments.length === 0) {
      return {
        totalEnvironments: 0,
        environments: [],
        message: "No environments available.",
      };
    }

    if (environmentId !== undefined || environmentName !== undefined) {
      const environment =
        findAgentEnvironment(environments, {
          id: environmentId,
          name: environmentName,
        }) ?? null;

      if (environment === null) {
        return {
          totalEnvironments: environments.length,
          error: "Environment not found.",
        };
      }

      if (variableName !== undefined) {
        const variable =
          findAgentEnvironmentVariable(environment, variableName) ?? null;

        if (variable === null) {
          return {
            environment: {
              id: environment.id,
              name: environment.name,
            },
            error: `Variable '${variableName}' not found in environment.`,
          };
        }

        return {
          environment: {
            id: environment.id,
            name: environment.name,
          },
          variable,
        };
      }

      return {
        environment,
        totalVariables: environment.variables.length,
      };
    }

    return {
      totalEnvironments: environments.length,
      environments,
    };
  },
});


