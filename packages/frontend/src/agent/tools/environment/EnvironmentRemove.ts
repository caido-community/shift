import { tool } from "ai";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { isPresent, truncate } from "@/utils";

const inputSchema = z.object({
  id: z.coerce.string().describe("The ID of the environment to delete"),
});

const valueSchema = z.object({
  deletedId: z.string(),
  name: z.string(),
});

const outputSchema = ToolResult.schema(valueSchema);

type EnvironmentRemoveInput = z.infer<typeof inputSchema>;
type EnvironmentRemoveValue = z.infer<typeof valueSchema>;
type EnvironmentRemoveOutput = ToolResultType<EnvironmentRemoveValue>;

export const display = {
  streaming: ({ input }) => [
    { text: "Deleting environment " },
    { text: isPresent(input?.id) ? truncate(input.id, 16) : "...", muted: true },
  ],
  success: ({ output }) => [
    { text: "Deleted environment " },
    { text: isPresent(output?.name) ? truncate(output.name, 32) : "environment", muted: true },
  ],
  error: () => "Failed to delete environment",
} satisfies ToolDisplay<EnvironmentRemoveInput, EnvironmentRemoveValue>;

export const EnvironmentRemove = tool({
  description:
    "Permanently delete a Caido environment by its ID. Use this to clean up temporary environments created during testing or remove outdated configurations. This action cannot be undone. The environment ID can be found using sdk.graphql.environments(). If the deleted environment was the active environment, you may need to select a different one. Returns the deleted environment's ID and name for confirmation.",
  inputSchema,
  outputSchema,
  execute: async ({ id }, { experimental_context }): Promise<EnvironmentRemoveOutput> => {
    const context = experimental_context as AgentContext;

    const currentEnvResult = await context.sdk.graphql.environment({ id });
    const currentEnv = currentEnvResult.environment;
    const envName = currentEnv?.name ?? id;

    const result = await context.sdk.graphql.deleteEnvironment({ id });

    const error = result.deleteEnvironment.error;
    if (isPresent(error)) {
      const errorMessage =
        "code" in error ? `Error: ${error.code}` : "Failed to delete environment";
      return ToolResult.err(errorMessage);
    }

    const deletedId = result.deleteEnvironment.deletedId;
    if (!isPresent(deletedId)) {
      return ToolResult.err("No deleted ID returned");
    }

    return ToolResult.ok({
      message: `Deleted environment "${envName}"`,
      deletedId,
      name: envName,
    });
  },
});
