import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import { ActionResult, type FloatToolContext } from "@/float/types";
import { withActiveEditorView } from "@/float/utils";

const inputSchema = z.object({
  headerName: z.string().describe("Header name (non-empty)"),
  headerValue: z.string().describe("Header value to set"),
});

export const editorHeaderSetTool = tool({
  description:
    "Set an HTTP header in the active editor. Replaces existing header with same name or adds it if not present.",
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: ({ headerName, headerValue }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    return withActiveEditorView(sdk, ({ view, update }) => {
      const currentText = view.state.doc.toString();
      const modifiedRequest = HttpForge.create(currentText)
        .setHeader(headerName, headerValue)
        .build();
      update(modifiedRequest);
      return ActionResult.ok(`Header ${headerName} set in active editor`);
    });
  },
});
