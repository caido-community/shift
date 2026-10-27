import { tool } from "ai";
import { z } from "zod";

import { ToolResult } from "@/agent/types";
import { type FloatToolContext } from "@/float/types";
import { normalizeEnvironmentVariable } from "@/float/utils";

const environmentVariableSchema = z.object({
  name: z.string().describe("The name of the environment variable to set (non-empty)."),
  value: z.string().describe("The value assigned to the environment variable."),
  kind: z
    .enum(["PLAIN", "SECRET"])
    .describe("The kind of the environment variable. Use PLAIN if not specified."),
});

const inputSchema = z.object({
  environmentName: z.string().describe("The name of the environment to create (non-empty)."),
  variables: z
    .array(environmentVariableSchema)
    .describe(
      "List of variables that will be created alongside the environment. Use empty array if none."
    ),
});

export const environmentCreateTool = tool({
  description: "Create a new environment optionally pre-populated with variables",
  inputSchema,
  outputSchema: ToolResult.schema(),
  execute: async ({ environmentName, variables }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;

    try {
      const result = await sdk.graphql.createEnvironment({
        input: {
          name: environmentName,
          variables: variables.map(normalizeEnvironmentVariable),
        },
      });

      const environment = result?.createEnvironment?.environment;

      if (environment === undefined || environment === null) {
        return ToolResult.err("Failed to create environment");
      }

      return ToolResult.ok({ message: `Environment ${environment.name} created successfully` });
    } catch (error) {
      return ToolResult.err(
        "Failed to create environment",
        error instanceof Error ? error.message : undefined
      );
    }
  },
});
