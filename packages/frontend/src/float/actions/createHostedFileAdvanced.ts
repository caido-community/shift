import { tool } from "ai";
import { z } from "zod";

import { actionError, hostedFileConfirmation } from "@/float/actionUtils";
import { type FloatToolContext } from "@/float/types";

const InputSchema = z.object({
  file_name: z.string().describe("Name of the file to create (non-empty)"),
  js_script: z
    .string()
    .describe(
      "JavaScript code to execute. The result will be used as file content",
    ),
});

export const createHostedFileAdvancedTool = tool({
  description:
    "Create a hosted file by executing JavaScript code to generate content. Use this for generating large payloads, sequences (e.g., 100 numbers), encoded data, or complex wordlists. For simple wordlists with few lines, use the basic createHostedFile tool instead.",
  inputSchema: InputSchema,
  execute: ({ file_name, js_script }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    try {
      let content: string;

      try {
        const result = eval(js_script);
        content = String(result);
      } catch (evalError) {
        return actionError("Failed to execute JavaScript", evalError);
      }

      hostedFileConfirmation(sdk, {
        fileName: file_name,
        content,
      });

      return {
        success: true,
        frontend_message: "",
      };
    } catch (error) {
      return actionError("Failed to create hosted file", error);
    }
  },
});
