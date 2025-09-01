import { tool } from "ai";
import { z } from "zod";

const RunJavaScriptSchema = z.object({
  code: z
    .string()
    .min(1)
    .describe(
      "The JavaScript code to execute. This is being run in user's browser, so make sure to use only safe functions.",
    ),
});

export const runJavaScriptTool = tool({
  description:
    "Execute JavaScript code for data processing, encoding/decoding, calculations, or string manipulation. Use this when you need to transform data, decode Base64, parse JSON, parse URLs, generate timestamps, or perform complex logic that other tools cannot handle.",
  inputSchema: RunJavaScriptSchema,
  execute: (input) => {
    try {
      const result = eval(input.code);
      if (typeof result === "string") {
        return { result };
      }
      try {
        return { result: JSON.stringify(result, null, 2) };
      } catch {
        return { result: String(result) };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { error: `JavaScript evaluation failed: ${message}` };
    }
  },
});
