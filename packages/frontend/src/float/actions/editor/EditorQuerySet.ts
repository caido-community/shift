import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import { ActionResult, type FloatToolContext } from "@/float/types";
import { withActiveEditorView } from "@/float/utils";

const inputSchema = z.object({
  paramName: z.string().describe("Query parameter name (non-empty)"),
  value: z.string().describe("Query parameter value to set"),
});

export const editorQuerySetTool = tool({
  description:
    "Set a query parameter in the HTTP request URL in the active editor. Replaces existing parameter with same name or adds it if not present.",
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: ({ paramName, value }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    return withActiveEditorView(sdk, ({ view, update }) => {
      const currentText = view.state.doc.toString();
      const modifiedRequest = HttpForge.create(currentText)
        .upsertQueryParam(paramName, value)
        .build();
      update(modifiedRequest);
      return ActionResult.ok(`Query parameter ${paramName} set in active editor`);
    });
  },
});
