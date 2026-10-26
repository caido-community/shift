import { tool } from "ai";
import { z } from "zod";

import { ToolResult } from "@/agent/types";
import { type FloatToolContext } from "@/float/types";
import { withActiveEditorView } from "@/float/utils";

const inputSchema = z.object({
  match: z.string().describe("Substring or pattern to replace (literal, non-empty)"),
  replace: z.string().describe("Replacement text"),
});

export const editorStringReplaceTool = tool({
  description: "Replace all literal occurrences in the active editor and focus it",
  inputSchema,
  outputSchema: ToolResult.schema(),
  execute: ({ match, replace }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    return withActiveEditorView(sdk, ({ view, update }) => {
      const currentText = view.state.doc.toJSON().join("\r\n");
      const newText = currentText.replace(match, replace);
      update(newText);
      return ToolResult.ok({ message: "Text replaced in active editor" });
    });
  },
});
