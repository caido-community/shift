import { tool } from "ai";
import { z } from "zod";

import { actionError, actionSuccess } from "@/float/actionUtils";
import { type FloatToolContext } from "@/float/types";

const InputSchema = z.object({
  id: z
    .string()
    .describe("ID of the environment that should be deleted (non-empty)."),
});

export const deleteEnvironmentTool = tool({
  description: "Delete an existing environment by id",
  inputSchema: InputSchema,
  execute: async ({ id }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    try {
      await sdk.graphql.deleteEnvironment({ id });

      return actionSuccess(`Environment ${id} deleted successfully`);
    } catch (error) {
      return actionError("Failed to delete environment", error);
    }
  },
});
