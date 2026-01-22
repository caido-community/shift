import { tool } from "ai";
import { z } from "zod";

import { ActionResult, type FloatToolContext } from "@/float/types";
import { withActiveEditor } from "@/float/utils";

const inputSchema = z.object({
  text: z.string().describe("Text to insert in place of current selection (non-empty)"),
});

export const editorSelectionReplaceTool = tool({
  description: "Replace current selection in the active editor and focus it",
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: ({ text }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    return withActiveEditor(sdk, (editor) => {
      editor.replaceSelectedText(text);
      editor.focus();
      return ActionResult.ok("Selection replaced in active editor");
    });
  },
});
