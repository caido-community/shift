import { tool } from "ai";
import { z } from "zod";

import { ActionResult, type FloatToolContext } from "@/float/types";
import { withActiveEditorView } from "@/float/utils";

const inputSchema = z.object({
  text: z.string().describe("Complete raw HTTP request text to replace in replay editor"),
});

export const replayRequestReplaceTool = tool({
  description: "Replace the entire request content in the current replay tab editor",
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: ({ text }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    return withActiveEditorView(sdk, (context) => {
      context.update(text);
      return ActionResult.ok("Request replaced in replay editor");
    });
  },
});
