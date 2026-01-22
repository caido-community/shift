import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import { ActionResult, type FloatToolContext } from "@/float/types";
import { withActiveEditorView } from "@/float/utils";

const inputSchema = z.object({
  header: z.string().describe("Header in format 'Name: Value' (non-empty)"),
  replace: z.boolean().describe("Replace existing header with same name if it exists"),
});

export const editorHeaderAddTool = tool({
  description: "Add or replace an HTTP header in the active editor",
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: ({ header, replace }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    return withActiveEditorView(sdk, ({ view, update }) => {
      const headerParts = header.split(":");
      if (headerParts.length < 2) {
        return ActionResult.err("Header must be in format 'Name: Value'");
      }

      const headerName = headerParts[0]?.trim();
      if (headerName === undefined) {
        return ActionResult.err("Header name is undefined");
      }

      const headerValue = headerParts.slice(1).join(":").trim();
      const currentText = view.state.doc.toString();
      let modifiedRequest: string;

      if (replace) {
        modifiedRequest = HttpForge.create(currentText).setHeader(headerName, headerValue).build();
      } else {
        modifiedRequest = HttpForge.create(currentText).addHeader(headerName, headerValue).build();
      }

      update(modifiedRequest);

      return ActionResult.ok(`Header ${headerName} ${replace ? "set" : "added"} in active editor`);
    });
  },
});
