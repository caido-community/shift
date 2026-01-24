import { tool } from "ai";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { type FrontendSDK } from "@/types";
import { isPresent, truncate } from "@/utils";

type UpdateEnvironmentResult = Awaited<ReturnType<FrontendSDK["graphql"]["updateEnvironment"]>>;
type EnvironmentFull = NonNullable<UpdateEnvironmentResult["updateEnvironment"]["environment"]>;

type EnvironmentVariableKindValue = EnvironmentFull extends {
  variables: Array<{ kind: infer K }>;
}
  ? K
  : string;

const variableInputSchema = z.object({
  name: z.string().describe("The name of the environment variable"),
  value: z.string().describe("The value of the environment variable"),
  kind: z
    .enum(["PLAIN", "SECRET"])
    .describe("The kind of variable: PLAIN for visible, SECRET for hidden values"),
});

const inputSchema = z.object({
  id: z.coerce.string().describe("The ID of the environment to update"),
  name: z.string().describe("The new name of the environment"),
  variables: z
    .array(variableInputSchema)
    .describe("The environment variables (replaces all existing variables)"),
});

const environmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.number(),
});

const valueSchema = z.object({
  environment: environmentSchema,
});

const outputSchema = ToolResult.schema(valueSchema);

type EnvironmentUpdateInput = z.infer<typeof inputSchema>;
type EnvironmentUpdateValue = z.infer<typeof valueSchema>;
type EnvironmentUpdateOutput = ToolResultType<EnvironmentUpdateValue>;

export const display = {
  streaming: ({ input }) => [
    { text: "Updating environment " },
    { text: isPresent(input?.name) ? truncate(input.name, 32) : "...", muted: true },
  ],
  success: ({ input }) => [
    { text: "Updated environment " },
    { text: isPresent(input?.name) ? truncate(input.name, 32) : "environment", muted: true },
  ],
  error: () => "Failed to update environment",
} satisfies ToolDisplay<EnvironmentUpdateInput, EnvironmentUpdateValue>;

export const EnvironmentUpdate = tool({
  description:
    "Update an existing Caido environment by ID. This completely replaces all variables with the provided list - any variables not included will be deleted. Use this to update stored tokens, credentials, or configuration values. To add a single variable while preserving others, first fetch the current environment variables, add the new one, then call this tool with the complete list. The environment ID can be found using sdk.graphql.environments(). Each variable requires name, value, and kind (PLAIN or SECRET). Returns the updated environment's ID, name, and version number.",
  inputSchema,
  outputSchema,
  execute: async (
    { id, name, variables },
    { experimental_context }
  ): Promise<EnvironmentUpdateOutput> => {
    const context = experimental_context as AgentContext;

    const currentEnvResult = await context.sdk.graphql.environment({ id });
    const currentEnv = currentEnvResult.environment;

    if (!isPresent(currentEnv)) {
      return ToolResult.err(`Environment with ID "${id}" not found`);
    }

    const result = await context.sdk.graphql.updateEnvironment({
      id,
      input: {
        name,
        version: currentEnv.version,
        variables: variables.map((v) => ({
          name: v.name,
          value: v.value,
          kind: v.kind as EnvironmentVariableKindValue,
        })),
      },
    });

    const error = result.updateEnvironment.error;
    if (isPresent(error)) {
      const errorMessage =
        "code" in error ? `Error: ${error.code}` : "Failed to update environment";
      return ToolResult.err(errorMessage);
    }

    const environment = result.updateEnvironment.environment;
    if (!isPresent(environment)) {
      return ToolResult.err("No environment returned");
    }

    return ToolResult.ok({
      message: `Updated environment "${environment.name}"`,
      environment: {
        id: environment.id,
        name: environment.name,
        version: environment.version,
      },
    });
  },
});
