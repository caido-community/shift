import { z } from "zod";

import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

export const runConvertWorkflowSchema = z.object({
  name: z.literal("runConvertWorkflow"),
  parameters: z.object({
    id: z.string().min(1).describe("Workflow ID to run"),
    input: z.string().describe("Input data for the workflow."),
  }),
});

export type RunConvertWorkflowInput = z.infer<typeof runConvertWorkflowSchema>;

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

      return {
        success: true,
        frontend_message: `Convert workflow executed successfully. Output: ${result.runConvertWorkflow.output}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to run convert workflow: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
};
