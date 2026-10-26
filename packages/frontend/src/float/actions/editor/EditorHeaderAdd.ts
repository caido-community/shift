import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import { ToolResult } from "@/agent/types";
import { type FloatToolContext } from "@/float/types";
import { withActiveEditorView } from "@/float/utils";

const inputSchema = z.object({
  header: z.string().describe("Header in format 'Name: Value' (non-empty)"),
  replace: z.boolean().describe("Replace existing header with same name if it exists"),
});

export const editorHeaderAddTool = tool({
  description: "Add or replace an HTTP header in the active editor",
  inputSchema,
  outputSchema: ToolResult.schema(),
  execute: ({ header, replace }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    const separator = header.indexOf(":");
    if (separator === -1) {
      return ToolResult.err("Header must be in format 'Name: Value'");
    }

    const headerName = header.slice(0, separator).trim();
    const headerValue = header.slice(separator + 1).trim();
    return withActiveEditorView(sdk, ({ view, update }) => {
      const forge = HttpForge.create(view.state.doc.toString());
      const modifiedRequest = replace
        ? forge.setHeader(headerName, headerValue).build()
        : forge.addHeader(headerName, headerValue).build();
      update(modifiedRequest);
      return ToolResult.ok({
        message: `Header ${headerName} ${replace ? "set" : "added"} in active editor`,
      });
    });
  },
});
