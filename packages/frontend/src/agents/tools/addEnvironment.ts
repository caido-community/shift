import { tool } from "ai";
import { z } from "zod";

import {
  fetchAgentEnvironmentById,
  AgentEnvironment,
} from "@/agents/utils/environment";
import { type ToolContext } from "@/agents/types";

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
  environment: AgentEnvironment | null | undefined,
) => {
  if (environment === null || environment === undefined) {
    return null;
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
    const payload =
      variables?.map((variable) => ({
        name: variable.name,
        value: variable.value,
        kind: variable.kind ?? "PLAIN",
      })) ?? [];

    try {
      const result = await sdk.graphql.createEnvironment({
        input: {
          name: normalizedName,
          variables: payload,
        },
      });

      const createdEnvironmentId =
        (result as {
          createEnvironment?: { environment?: { id?: string | null } | null };
        })?.createEnvironment?.environment?.id ?? null;

      if (
        createdEnvironmentId === null ||
        typeof createdEnvironmentId !== "string"
      ) {
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


