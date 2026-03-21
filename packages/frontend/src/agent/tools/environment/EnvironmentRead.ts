import { tool } from "ai";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { isPresent, truncate } from "@/utils";

const inputSchema = z.object({
  id: z.coerce.string().optional().describe("Environment ID to read."),
  name: z.string().optional().describe("Environment name to read when ID is not known."),
});

const variableSchema = z.object({
  name: z.string(),
  value: z.string(),
  kind: z.string(),
});

const valueSchema = z.object({
  environment: z.object({
    id: z.string(),
    name: z.string(),
    version: z.number(),
    variables: z.array(variableSchema),
  }),
});

const outputSchema = ToolResult.schema(valueSchema);

type EnvironmentReadInput = z.infer<typeof inputSchema>;
type EnvironmentReadValue = z.infer<typeof valueSchema>;
type EnvironmentReadOutput = ToolResultType<EnvironmentReadValue>;

export const display = {
  streaming: ({ input }) => [
    { text: "Reading environment " },
    { text: truncate(input?.name ?? input?.id ?? "selected", 32), muted: true },
  ],
  success: ({ output }) => [
    { text: "Read environment " },
    { text: truncate(output?.environment.name ?? "environment", 32), muted: true },
  ],
  error: () => "Failed to read environment",
} satisfies ToolDisplay<EnvironmentReadInput, EnvironmentReadValue>;

export const EnvironmentRead = tool({
  description:
    "Read the full details of a Caido environment, including all variable names, values, and kinds. Use this when the context only shows previews of environment variables or when you need the complete current variable list before updating an environment. If id and name are omitted, the currently selected environment is read.",
  inputSchema,
  outputSchema,
  execute: async ({ id, name }, { experimental_context }): Promise<EnvironmentReadOutput> => {
    const context = experimental_context as AgentContext;

    const environmentId = await resolveEnvironmentId(context, { id, name });
    if (!isPresent(environmentId)) {
      return ToolResult.err(
        "No environment selected",
        "Provide an environment id or name, or select an environment in Caido first."
      );
    }

    const result = await context.sdk.graphql.environment({ id: environmentId });
    const environment = result.environment;

    if (!isPresent(environment)) {
      return ToolResult.err(`Environment with ID "${environmentId}" not found`);
    }

    return ToolResult.ok({
      message: `Read environment "${environment.name}".`,
      environment: {
        id: environment.id,
        name: environment.name,
        version: environment.version,
        variables: environment.variables.map((variable) => ({
          name: variable.name,
          value: variable.value,
          kind: variable.kind,
        })),
      },
    });
  },
});

export async function resolveEnvironmentId(
  context: AgentContext,
  options: { id?: string; name?: string }
): Promise<string | undefined> {
  if (isPresent(options.id) && options.id.trim() !== "") {
    return options.id;
  }

  if (isPresent(options.name) && options.name.trim() !== "") {
    const environmentsResult = await context.sdk.graphql.environments();
    const matched = environmentsResult.environments.find(
      (environment) => environment.name === options.name
    );
    return matched?.id;
  }

  await context.fetchEnvironmentInfo();
  return context.selectedEnvironmentId;
}
