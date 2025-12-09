import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import {
  actionError,
  actionSuccess,
  replaceEditorContent,
  withActiveEditorView,
} from "@/float/actionUtils";
import { type FloatToolContext } from "@/float/types";

const InputSchema = z.object({
  paramName: z
    .string()
    .describe("Query parameter name to remove (non-empty)"),
});

export const activeEditorRemoveQueryParameterTool = tool({
  description:
    "Remove a query parameter from the HTTP request URL in the active editor",
  inputSchema: InputSchema,
  execute: ({ paramName }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    return withActiveEditorView(sdk, (view) => {
      try {
        const currentText = view.state.doc.toString();

        const modifiedRequest = HttpForge.create(currentText)
          .removeQueryParam(paramName)
          .build();

        replaceEditorContent(view, modifiedRequest);

        return actionSuccess(
          `Query parameter ${paramName} removed from active editor`,
        );
      } catch (error) {
        return actionError("Failed to remove query parameter", error);
      }
    });
  },
});
