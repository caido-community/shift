import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import { ActionResult, type FloatToolContext } from "@/float/types";
import { withActiveEditorView } from "@/float/utils";

const inputSchema = z.object({
  body: z.string().describe("The new body content to replace everything after headers"),
});

export const editorBodyReplaceTool = tool({
  description: "Replace the HTTP body content in the active editor, preserving headers",
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: ({ body }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    return withActiveEditorView(sdk, ({ view, update }) => {
      const currentText = view.state.doc.toString();
      const modifiedRequest = HttpForge.create(currentText).body(body).build();
      update(modifiedRequest);
      return ActionResult.ok("Body replaced in active editor");
    });
  },
});
