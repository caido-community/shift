import { tool } from "ai";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { type FrontendSDK } from "@/types";
import { isPresent, truncate } from "@/utils";

type CreateEnvironmentResult = Awaited<ReturnType<FrontendSDK["graphql"]["createEnvironment"]>>;
type EnvironmentFull = NonNullable<CreateEnvironmentResult["createEnvironment"]["environment"]>;

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
  name: z.string().describe("The name of the environment"),
  variables: z
    .array(variableInputSchema)
    .describe("The environment variables to include in this environment"),
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

type EnvironmentCreateInput = z.infer<typeof inputSchema>;
type EnvironmentCreateValue = z.infer<typeof valueSchema>;
type EnvironmentCreateOutput = ToolResultType<EnvironmentCreateValue>;

export const display = {
  streaming: ({ input }) => [
    { text: "Creating environment " },
    { text: isPresent(input?.name) ? truncate(input.name, 32) : "...", muted: true },
  ],
  success: ({ input }) => [
    { text: "Created environment " },
    { text: isPresent(input?.name) ? truncate(input.name, 32) : "environment", muted: true },
  ],
  error: () => "Failed to create environment",
} satisfies ToolDisplay<EnvironmentCreateInput, EnvironmentCreateValue>;

export const EnvironmentCreate = tool({
  description:
    "Create a new Caido environment with named variables that can be referenced in requests using §§§Env§EnvironmentName§Variable_Name§§§ syntax. Use this to store reusable values like API keys, session tokens, base URLs, or test credentials that need to be used across multiple requests. Each variable has a name, value, and kind (PLAIN for visible values, SECRET for sensitive values that should be masked in the UI). The environment persists in Caido and can be selected as the active environment. Returns the created environment's ID, name, and version number.",
  inputSchema,
  outputSchema,
  execute: async (
    { name, variables },
    { experimental_context }
  ): Promise<EnvironmentCreateOutput> => {
    const context = experimental_context as AgentContext;

    const result = await context.sdk.graphql.createEnvironment({
      input: {
        name,
        variables: variables.map((v) => ({
          name: v.name,
          value: v.value,
          kind: v.kind as EnvironmentVariableKindValue,
        })),
      },
    });

    const error = result.createEnvironment.error;
    if (isPresent(error)) {
      const errorMessage =
        "code" in error ? `Error: ${error.code}` : "Failed to create environment";
      return ToolResult.err(errorMessage);
    }

    const environment = result.createEnvironment.environment;
    if (!isPresent(environment)) {
      return ToolResult.err("No environment returned");
    }

    return ToolResult.ok({
      message: `Created environment "${environment.name}"`,
      environment: {
        id: environment.id,
        name: environment.name,
        version: environment.version,
      },
    });
  },
});
