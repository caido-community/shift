import { tool } from "ai";
import { z } from "zod";

import { actionSuccess, withActiveEditor } from "@/float/actionUtils";
import { type FloatToolContext } from "@/float/types";

const InputSchema = z.object({
  text: z
    .string()
    .describe("Text to insert in place of current selection (non-empty)"),
});

export const activeEditorReplaceSelectionTool = tool({
  description: "Replace current selection in the active editor and focus it",
  inputSchema: InputSchema,
  execute: ({ text }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    return withActiveEditor(sdk, (editor) => {
      editor.replaceSelectedText(text);
      editor.focus();

      return actionSuccess("Selection replaced in active editor");
    });
  },
});
