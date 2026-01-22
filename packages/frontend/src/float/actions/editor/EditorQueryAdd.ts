import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import { ActionResult, type FloatToolContext } from "@/float/types";
import { withActiveEditorView } from "@/float/utils";

const inputSchema = z.object({
  paramName: z.string().describe("Query parameter name (non-empty)"),
  value: z.string().describe("Query parameter value"),
});

export const editorQueryAddTool = tool({
  description: "Add or update a query parameter in the HTTP request URL in the active editor",
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: ({ paramName, value }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    return withActiveEditorView(sdk, ({ view, update }) => {
      const currentText = view.state.doc.toString();
      const modifiedRequest = HttpForge.create(currentText).addQueryParam(paramName, value).build();
      update(modifiedRequest);
      return ActionResult.ok(`Query parameter ${paramName} added in active editor`);
    });
  },
});
