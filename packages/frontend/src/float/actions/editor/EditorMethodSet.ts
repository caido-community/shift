import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import { ToolResult } from "@/agent/types";
import { type FloatToolContext } from "@/float/types";
import { withActiveEditorView } from "@/float/utils";

const inputSchema = z.object({
  method: z.string().describe("The HTTP method to set (e.g., GET, POST, PUT, DELETE)"),
});

export const editorMethodSetTool = tool({
  description: "Set the HTTP method in the active editor",
  inputSchema,
  outputSchema: ToolResult.schema(),
  execute: ({ method }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    return withActiveEditorView(sdk, ({ view, update }) => {
      const currentText = view.state.doc.toString();
      const modifiedRequest = HttpForge.create(currentText).method(method).build();
      update(modifiedRequest);
      return ToolResult.ok({ message: `Method set to ${method} in active editor` });
    });
  },
});
