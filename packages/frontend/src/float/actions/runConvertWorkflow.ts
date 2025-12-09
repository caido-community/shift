import { z } from "zod";

import { actionError, actionSuccess } from "@/float/actionUtils";
import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

const runConvertWorkflowSchema = z.object({
  name: z.literal("runConvertWorkflow"),
  parameters: z.object({
    id: z.string().describe("Workflow ID to run (non-empty)"),
    input: z.string().describe("Input data for the workflow."),
  }),
});

type RunConvertWorkflowInput = z.infer<typeof runConvertWorkflowSchema>;

export const runConvertWorkflow: ActionDefinition<RunConvertWorkflowInput> = {
  name: "runConvertWorkflow",
  description: "Run a convert workflow with specified ID and input data",
  inputSchema: runConvertWorkflowSchema,
  execute: async (
    sdk: FrontendSDK,
    { id, input }: RunConvertWorkflowInput["parameters"],
  ) => {
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
};
