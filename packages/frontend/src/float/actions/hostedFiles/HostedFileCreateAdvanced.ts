import { tool } from "ai";
import { z } from "zod";

import { ActionResult, type FloatToolContext } from "@/float/types";
import { hostedFileConfirmation } from "@/float/utils";

const inputSchema = z.object({
  file_name: z.string().describe("Name of the file to create (non-empty)"),
  js_script: z
    .string()
    .describe("JavaScript code to execute. The result will be used as file content"),
});

export const hostedFileCreateAdvancedTool = tool({
  description:
    "Create a hosted file by executing JavaScript code to generate content. Use this for generating large payloads, sequences (e.g., 100 numbers), encoded data, or complex wordlists. For simple wordlists with few lines, use the basic createHostedFile tool instead.",
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: ({ file_name, js_script }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    let content: string;

    try {
      const result = eval(js_script);
      content = String(result);
    } catch (evalError) {
      return ActionResult.err(
        "Failed to execute JavaScript",
        evalError instanceof Error ? evalError.message : "Unknown error"
      );
    }

    hostedFileConfirmation(sdk, {
      fileName: file_name,
      content,
    });

    return ActionResult.ok("");
  },
});
