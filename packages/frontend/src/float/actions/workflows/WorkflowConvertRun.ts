import { tool } from "ai";
import { z } from "zod";

import { ActionResult, type FloatToolContext } from "@/float/types";

const inputSchema = z.object({
  id: z.string().describe("Workflow ID to run (non-empty)"),
  input: z.string().describe("Input data for the workflow."),
});

export const workflowConvertRunTool = tool({
  description: "Run a convert workflow with specified ID and input data",
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: async ({ id, input }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    const result = await sdk.graphql.runConvertWorkflow({
      id: id,
      input: input,
    });

    return ActionResult.ok(
      `Convert workflow executed successfully. Output: ${result.runConvertWorkflow.output}`
    );
  },
});
