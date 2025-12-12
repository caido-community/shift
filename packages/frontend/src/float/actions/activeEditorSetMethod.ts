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
  method: z
    .string()
    .describe("The HTTP method to set (e.g., GET, POST, PUT, DELETE)"),
});

export const activeEditorSetMethodTool = tool({
  description: "Set the HTTP method in the active editor",
  inputSchema: InputSchema,
  execute: ({ method }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    return withActiveEditorView(sdk, (view) => {
      try {
        const currentText = view.state.doc.toString();

        const modifiedRequest = HttpForge.create(currentText)
          .method(method)
          .build();

        replaceEditorContent(view, modifiedRequest);

        return actionSuccess(`Method set to ${method} in active editor`);
      } catch (error) {
        return actionError("Failed to set method", error);
      }
    });
  },
});
