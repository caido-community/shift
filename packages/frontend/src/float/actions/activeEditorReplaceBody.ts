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
  body: z
    .string()
    .describe("The new body content to replace everything after headers"),
});

export const activeEditorReplaceBodyTool = tool({
  description:
    "Replace the HTTP body content in the active editor, preserving headers",
  inputSchema: InputSchema,
  execute: ({ body }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    return withActiveEditorView(sdk, (view) => {
      try {
        const currentText = view.state.doc.toString();

        const modifiedRequest = HttpForge.create(currentText)
          .body(body)
          .build();

        replaceEditorContent(view, modifiedRequest);

        return actionSuccess(`Body replaced in active editor`);
      } catch (error) {
        return actionError("Failed to replace body", error);
      }
    });
  },
});
