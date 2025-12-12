import { tool } from "ai";
import { z } from "zod";

import {
  actionError,
  actionSuccess,
  replaceEditorContent,
  withActiveEditorView,
} from "@/float/actionUtils";
import { type FloatToolContext } from "@/float/types";

const InputSchema = z.object({
  match: z
    .string()
    .describe("Substring or pattern to replace (literal, non-empty)"),
  replace: z.string().describe("Replacement text"),
});

export const activeEditorReplaceByStringTool = tool({
  description:
    "Replace all literal occurrences in the active editor and focus it",
  inputSchema: InputSchema,
  execute: ({ match, replace }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    return withActiveEditorView(sdk, (view) => {
      try {
        const currentText = view.state.doc.toJSON().join("\r\n");
        const newText = currentText.replace(match, replace);

        replaceEditorContent(view, newText);

        return actionSuccess("Text replaced in active editor");
      } catch (error) {
        return actionError("Failed to replace text", error);
      }
    });
  },
});
