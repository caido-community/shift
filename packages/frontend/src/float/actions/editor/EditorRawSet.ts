import { tool } from "ai";
import { z } from "zod";

import { ActionResult, type FloatToolContext } from "@/float/types";
import { withActiveEditorView } from "@/float/utils";

const inputSchema = z.object({
  content: z.string().describe("Raw content to set in the active editor (non-empty)"),
});

export const editorRawSetTool = tool({
  description: "Set the entire content of the active editor with raw text",
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: ({ content }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    return withActiveEditorView(sdk, ({ update }) => {
      const normalizedContent = content.replace(/\r?\n/g, "\r\n");
      update(normalizedContent);
      return ActionResult.ok("Content set in active editor");
    });
  },
});
