import { tool } from "ai";
import { z } from "zod";

import { ActionResult, type FloatToolContext } from "@/float/types";

const inputSchema = z.object({
  id: z.string().describe("ID of the environment that should be deleted (non-empty)."),
});

export const environmentDeleteTool = tool({
  description: "Delete an existing environment by id",
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: async ({ id }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;

    try {
      await sdk.graphql.deleteEnvironment({ id });
      return ActionResult.ok(`Environment ${id} deleted successfully`);
    } catch (error) {
      return ActionResult.err(
        "Failed to delete environment",
        error instanceof Error ? error.message : undefined
      );
    }
  },
});
