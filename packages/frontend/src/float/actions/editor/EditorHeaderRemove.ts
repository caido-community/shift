import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import { ActionResult, type FloatToolContext } from "@/float/types";
import { withActiveEditorView } from "@/float/utils";

const inputSchema = z.object({
  headerName: z.string().describe("Name of the header to remove (case-insensitive, non-empty)"),
});

export const editorHeaderRemoveTool = tool({
  description: "Remove an HTTP header from the active editor by name",
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: ({ headerName }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    return withActiveEditorView(sdk, ({ view, update }) => {
      const currentText = view.state.doc.toString();
      const modifiedRequest = HttpForge.create(currentText).removeHeader(headerName).build();
      update(modifiedRequest);
      return ActionResult.ok(`Header ${headerName} removed from active editor`);
    });
  },
});
