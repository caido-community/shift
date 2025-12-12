import { tool } from "ai";
import { z } from "zod";

import { actionError, actionSuccess } from "@/float/actionUtils";
import { type FloatToolContext } from "@/float/types";

const InputSchema = z.object({
  id: z.string().describe("Workflow ID to run (non-empty)"),
  input: z.string().describe("Input data for the workflow."),
});

export const runConvertWorkflowTool = tool({
  description: "Run a convert workflow with specified ID and input data",
  inputSchema: InputSchema,
  execute: async ({ id, input }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    try {
      const result = await sdk.graphql.runConvertWorkflow({
        id: id,
        input: input,
      });

      return actionSuccess(
        `Convert workflow executed successfully. Output: ${result.runConvertWorkflow.output}`,
      );
    } catch (error) {
      return actionError("Failed to run convert workflow", error);
    }
  },
});
