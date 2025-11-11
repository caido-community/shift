import { tool } from "ai";
import { z } from "zod";

import { type ToolContext } from "@/agents/types";
import {
  type AgentEnvironment,
  fetchAgentEnvironmentById,
} from "@/agents/utils/environment";

type CreateEnvironmentMutation =
  ToolContext["sdk"]["graphql"]["createEnvironment"];
type CreateEnvironmentArgs = Parameters<CreateEnvironmentMutation>[0];
type CreateEnvironmentInput = CreateEnvironmentArgs extends {
  input: infer Input;
}
  ? Input
  : never;
type CreateEnvironmentVariableInput = CreateEnvironmentInput extends {
  variables: Array<infer Variable>;
}
  ? Variable
  : never;

const EnvironmentVariableSchema = z.object({
  name: z
    .string()
    .min(1)
    .describe("Variable name. Use descriptive keys tied to their owner."),
  value: z
    .string()
    .describe(
      "Variable value. Store identifiers, cookies, or sessions responsibly.",
    ),
  kind: z
    .string()
    .min(1)
    .optional()
    .describe("Kind of variable (defaults to PLAIN)."),
});

const AddEnvironmentSchema = z.object({
  name: z
    .string()
    .min(1)
    .describe(
      "Environment name. Shift-created environments should start with `[Shift] ` and reference the owning object.",
    ),
  variables: z
    .array(EnvironmentVariableSchema)
    .optional()
    .describe("Optional variables to seed within the new environment."),
});

const ensureShiftPrefix = (name: string): string =>
  name.startsWith("[Shift] ") ? name : `[Shift] ${name}`;

const normalizeEnvironmentResult = (
  environment: AgentEnvironment | undefined,
) => {
  if (environment === undefined) {
    return undefined;
  }

  return {
    environment,
    totalVariables: environment.variables.length,
  };
};

export const addEnvironmentTool = tool({
  description: `Create a new Shift-managed environment. Names are prefixed with [Shift] automatically when missing.`,
  inputSchema: AddEnvironmentSchema,
  execute: async ({ name, variables }, { experimental_context }) => {
    const context = experimental_context as ToolContext;
    const { sdk } = context;

    const normalizedName = ensureShiftPrefix(name.trim());
    const payload: CreateEnvironmentVariableInput[] =
      variables?.map((variable) => ({
        name: variable.name,
        value: variable.value,
        kind: (variable.kind ?? "PLAIN") as CreateEnvironmentVariableInput["kind"],
      })) ?? [];

    try {
      const result = await sdk.graphql.createEnvironment({
        input: {
          name: normalizedName,
          variables: payload,
        },
      });

      const environmentPayload = (
        result as {
          createEnvironment?: {
            environment?: { id?: unknown };
          };
        }
      )?.createEnvironment?.environment;
      const createdEnvironmentId =
        typeof environmentPayload?.id === "string"
          ? environmentPayload.id
          : undefined;

      if (createdEnvironmentId === undefined) {
        return {
          error: "Environment creation did not return a usable identifier.",
        };
      }

      const environment = await fetchAgentEnvironmentById(
        sdk,
        createdEnvironmentId,
      );

      return (
        normalizeEnvironmentResult(environment) ?? {
          message:
            "Environment created, but details could not be fetched. Use environementContextTool to inspect it.",
        }
      );
    } catch (error) {
      return {
        error: `Failed to create environment: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  },
});
