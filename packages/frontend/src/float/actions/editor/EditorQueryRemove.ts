import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import { ActionResult, type FloatToolContext } from "@/float/types";
import { withActiveEditorView } from "@/float/utils";

const inputSchema = z.object({
  paramName: z.string().describe("Query parameter name to remove (non-empty)"),
});

export const editorQueryRemoveTool = tool({
  description: "Remove a query parameter from the HTTP request URL in the active editor",
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: ({ paramName }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    return withActiveEditorView(sdk, ({ view, update }) => {
      const currentText = view.state.doc.toString();
      const modifiedRequest = HttpForge.create(currentText).removeQueryParam(paramName).build();
      update(modifiedRequest);
      return ActionResult.ok(`Query parameter ${paramName} removed from active editor`);
    });
  },
});
