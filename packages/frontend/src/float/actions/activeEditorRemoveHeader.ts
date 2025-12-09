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
  headerName: z
    .string()
    .describe("Name of the header to remove (case-insensitive, non-empty)"),
});

export const activeEditorRemoveHeaderTool = tool({
  description: "Remove an HTTP header from the active editor by name",
  inputSchema: InputSchema,
  execute: ({ headerName }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    return withActiveEditorView(sdk, (view) => {
      try {
        const currentText = view.state.doc.toString();

        const modifiedRequest = HttpForge.create(currentText)
          .removeHeader(headerName)
          .build();

        replaceEditorContent(view, modifiedRequest);

        return actionSuccess(
          `Header ${headerName} removed from active editor`,
        );
      } catch (error) {
        return actionError("Failed to remove header", error);
      }
    });
  },
});
