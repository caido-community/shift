import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import { ActionResult, type FloatToolContext } from "@/float/types";
import { withActiveEditorView } from "@/float/utils";

const inputSchema = z.object({
  path: z
    .string()
    .describe("New path for the HTTP request (non-empty), preserving query parameters"),
});

export const editorPathSetTool = tool({
  description:
    "Set the path portion of the HTTP request URL in the active editor while preserving query parameters. This CANNOT be used to change query parameters.",
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: ({ path }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    return withActiveEditorView(sdk, ({ view, update }) => {
      const currentText = view.state.doc.toString();
      const modifiedRequest = HttpForge.create(currentText).path(path).build();
      update(modifiedRequest);
      return ActionResult.ok("Path set in active editor");
    });
  },
});
