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
  path: z
    .string()
    .describe(
      "New path for the HTTP request (non-empty), preserving query parameters",
    ),
});

export const activeEditorUpdatePathTool = tool({
  description:
    "Update the path portion of the HTTP request URL in the active editor while preserving query parameters",
  inputSchema: InputSchema,
  execute: ({ path }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    return withActiveEditorView(sdk, (view) => {
      try {
        const currentText = view.state.doc.toString();

        const modifiedRequest = HttpForge.create(currentText)
          .path(path)
          .build();

        replaceEditorContent(view, modifiedRequest);

        return actionSuccess(`Path replaced in active editor`);
      } catch (error) {
        return actionError("Failed to replace path", error);
      }
    });
  },
});
