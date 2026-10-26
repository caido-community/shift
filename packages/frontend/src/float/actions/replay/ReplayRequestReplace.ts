import { tool } from "ai";
import { z } from "zod";

import { ToolResult } from "@/agent/types";
import { normalizeRawHttpRequest } from "@/agent/utils/http";
import { type FloatToolContext } from "@/float/types";
import { withActiveEditorView } from "@/float/utils";

const inputSchema = z.object({
  text: z.string().describe("Complete raw HTTP request text to replace in replay editor"),
});

export const replayRequestReplaceTool = tool({
  description: "Replace the entire request content in the current replay tab editor",
  inputSchema,
  outputSchema: ToolResult.schema(),
  execute: ({ text }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    return withActiveEditorView(sdk, (context) => {
      context.update(normalizeRawHttpRequest(text));
      return ToolResult.ok({ message: "Request replaced in replay editor" });
    });
  },
});
