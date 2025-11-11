import { z } from "zod";

import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

export const runWorkflowSchema = z.object({
  name: z.literal("runWorkflow"),
  parameters: z.object({
    id: z.string().min(1).describe("Workflow ID to run"),
    input: z.string().describe("Input data for the workflow."),
  }),
});

export type runWorkflowInput = z.infer<typeof runWorkflowSchema>;

export const runWorkflow: ActionDefinition<runWorkflowInput> = {
  name: "runWorkflow",
  description: "Run a workflow with specified ID and input data",
  inputSchema: runWorkflowSchema,
  execute: async (
    sdk: FrontendSDK,
    { id, input }: runWorkflowInput["parameters"],
  ) => {
    try {
      const view = sdk.window.getActiveEditor()?.getEditorView();

      if (view === undefined) {
        return {
          success: false,
          error: "No active editor view found",
        };
      }

      const result = await sdk.graphql.runConvertWorkflow({
        id: id,
        input: input,
      });

      const output = result.runConvertWorkflow.output ?? "";

      const currentText = view.state.doc.toString();
      const updatedText = currentText.replace(input, output);
      const normalizedText = updatedText.replace(/\r?\n/g, "\r\n");

      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: normalizedText,
        },
      });
      view.focus();
      return {
        success: true,
        frontend_message: `Convert workflow executed successfully. Output: ${output}`,
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
