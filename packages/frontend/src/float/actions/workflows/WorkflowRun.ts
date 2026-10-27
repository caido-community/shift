import { tool } from "ai";
import { z } from "zod";

import { ToolResult } from "@/agent/types";
import { type FloatToolContext } from "@/float/types";
import { withActiveEditorView } from "@/float/utils";

const inputSchema = z.object({
  id: z.string().describe("Workflow ID to run (non-empty)"),
  input: z.string().describe("Input data for the workflow."),
});

export const workflowRunTool = tool({
  description: "Run a workflow with specified ID and input data",
  inputSchema,
  outputSchema: ToolResult.schema(),
  execute: async ({ id, input }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;

    return await withActiveEditorView(sdk, async ({ view, update }) => {
      const result = await sdk.graphql.runConvertWorkflow({
        id: id,
        input: input,
      });

      const output = result.runConvertWorkflow?.output;
      if (output === undefined || output === null) {
        return ToolResult.err("Failed to run workflow");
      }

      const currentText = view.state.doc.toString();
      const updatedText = currentText.replace(input, output);
      const normalizedText = updatedText.replace(/\r?\n/g, "\r\n");

      update(normalizedText);

      return ToolResult.ok({
        message: `Convert workflow executed successfully. Output: ${output}`,
      });
    });
  },
});
