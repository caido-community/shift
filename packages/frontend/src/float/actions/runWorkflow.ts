import { tool } from "ai";
import { z } from "zod";

import { type FloatToolContext } from "@/float/types";

const InputSchema = z.object({
  id: z.string().describe("Workflow ID to run (non-empty)"),
  input: z.string().describe("Input data for the workflow."),
});

export const runWorkflowTool = tool({
  description: "Run a workflow with specified ID and input data",
  inputSchema: InputSchema,
  execute: async ({ id, input }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
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
});
