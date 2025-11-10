import { tool } from "ai";
import { z } from "zod";

import {
  fetchAgentEnvironmentById,
  fetchAgentEnvironments,
  findAgentEnvironment,
} from "@/agents/utils/environment";
import { type ToolContext } from "@/agents/types";

type UpdateEnvironmentMutation =
  ToolContext["sdk"]["graphql"]["updateEnvironment"];
type UpdateEnvironmentArgs = Parameters<UpdateEnvironmentMutation>[0];
type UpdateEnvironmentInput =
  UpdateEnvironmentArgs extends { input: infer Input } ? Input : never;
type EnvironmentVariableInput =
  UpdateEnvironmentInput extends { variables: Array<infer Variable> }
    ? Variable
    : never;
type EnvironmentVersion =
  UpdateEnvironmentInput extends { version: infer Version }
    ? Version
    : number;

const UpdateEnvironmentSchema = z
  .object({
    environmentId: z
      .string()
      .min(1)
      .optional()
      .describe("ID of the environment to update."),
    environmentName: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Name of the environment to update. Used when environmentId is not known.",
      ),
    variableName: z
      .string()
      .min(1)
      .describe("Name of the variable to add, update, or remove."),
    value: z
      .string()
      .optional()
      .describe(
        "Value to assign to the variable. Required when remove is false.",
      ),
    kind: z
      .string()
      .min(1)
      .optional()
      .describe("Kind of the variable (defaults to PLAIN)."),
    remove: z
      .boolean()
      .optional()
      .describe(
        "Set to true to remove the variable instead of updating or creating it.",
      ),
  })
  .refine(
    (input) =>
      input.environmentId !== undefined || input.environmentName !== undefined,
    {
      message: "Provide environmentId or environmentName.",
      path: ["environmentId"],
    },
  )
  .refine(
    (input) => input.remove === true || input.value !== undefined,
    {
      message: "Provide a value unless remove is set to true.",
      path: ["value"],
    },
  );

export const updateEnvironmentTool = tool({
  description: `Create, update, or delete a variable within a Shift environment.`,
  inputSchema: UpdateEnvironmentSchema,
  execute: async (
    { environmentId, environmentName, variableName, value, kind, remove },
    { experimental_context },
  ) => {
    const context = experimental_context as ToolContext;
    const { sdk } = context;

    const environments = await fetchAgentEnvironments(sdk);
    const environment =
      findAgentEnvironment(environments, {
        id: environmentId,
        name: environmentName,
      }) ?? null;

    if (environment === null) {
      return {
        error: "Environment not found.",
      };
    }

    const resolvedEnvironmentId = environment.id.startsWith("name:")
      ? null
      : environment.id;

    if (resolvedEnvironmentId === null) {
      return {
        environment: {
          id: environment.id,
          name: environment.name,
        },
        error:
          "Unable to resolve environment ID. Try specifying the environment by its ID instead of name.",
      };
    }

    const latestEnvironment =
      (await fetchAgentEnvironmentById(sdk, resolvedEnvironmentId)) ??
      environment;

    if (latestEnvironment.version === undefined) {
      return {
        environment: {
          id: latestEnvironment.id,
          name: latestEnvironment.name,
        },
        error: "Environment version unavailable; cannot perform update.",
      };
    }

    const versionValue = Number(latestEnvironment.version);

    if (!Number.isFinite(versionValue)) {
      return {
        environment: {
          id: latestEnvironment.id,
          name: latestEnvironment.name,
        },
        error: "Environment version is invalid; cannot perform update.",
      };
    }

    const variableKey = variableName.toLowerCase();
    const existingVariables = latestEnvironment.variables.slice();
    const toGraphQLVariables = (
      variables: typeof existingVariables,
    ): EnvironmentVariableInput[] =>
      variables.map((variable) => ({
        name: variable.name,
        value: variable.value,
        kind: (variable.kind ?? "PLAIN") as EnvironmentVariableInput["kind"],
      }));

    if (remove === true) {
      const filteredVariables = existingVariables.filter(
        (variable) => variable.name.toLowerCase() !== variableKey,
      );

      if (filteredVariables.length === existingVariables.length) {
        return {
          environment: {
            id: latestEnvironment.id,
            name: latestEnvironment.name,
          },
          message: `Variable '${variableName}' was not present.`,
        };
      }

      await sdk.graphql.updateEnvironment({
        id: resolvedEnvironmentId,
        input: {
          name: latestEnvironment.name,
          version: versionValue as EnvironmentVersion,
          variables: toGraphQLVariables(filteredVariables),
        },
      });

      const updatedEnvironment =
        (await fetchAgentEnvironmentById(sdk, resolvedEnvironmentId)) ??
        latestEnvironment;

      return {
        environment: updatedEnvironment,
        message: `Variable '${variableName}' removed successfully.`,
      };
    }

    // value is ensured to be provided by the schema unless remove === true.
    const nextVariable = {
      name: variableName,
      value: value as string,
      kind: kind ?? "PLAIN",
    };

    const index = existingVariables.findIndex(
      (variable) => variable.name.toLowerCase() === variableKey,
    );

    if (index >= 0) {
      existingVariables[index] = nextVariable;
    } else {
      existingVariables.push(nextVariable);
    }

    await sdk.graphql.updateEnvironment({
      id: resolvedEnvironmentId,
      input: {
        name: latestEnvironment.name,
        version: versionValue as EnvironmentVersion,
        variables: toGraphQLVariables(existingVariables),
      },
    });

    const updatedEnvironment =
      (await fetchAgentEnvironmentById(sdk, resolvedEnvironmentId)) ??
      latestEnvironment;

    return {
      environment: updatedEnvironment,
      message: `Variable '${variableName}' ${
        index >= 0 ? "updated" : "created"
      } successfully.`,
    };
  },
});


