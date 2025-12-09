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
  paramName: z.string().describe("Query parameter name (non-empty)"),
  value: z.string().describe("Query parameter value"),
});

export const activeEditorAddQueryParameterTool = tool({
  description:
    "Add or update a query parameter in the HTTP request URL in the active editor",
  inputSchema: InputSchema,
  execute: ({ paramName, value }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    return withActiveEditorView(sdk, (view) => {
      try {
        const currentText = view.state.doc.toString();

        const modifiedRequest = HttpForge.create(currentText)
          .addQueryParam(paramName, value)
          .build();

        replaceEditorContent(view, modifiedRequest);

        return actionSuccess(
          `Query parameter ${paramName} added in active editor`,
        );
      } catch (error) {
        return actionError("Failed to modify query parameter", error);
      }
    });
  },
});
