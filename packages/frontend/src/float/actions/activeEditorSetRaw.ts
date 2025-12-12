import { tool } from "ai";
import { z } from "zod";

import { type FloatToolContext } from "@/float/types";

const InputSchema = z.object({
  content: z
    .string()
    .describe("Raw content to set in the active editor (non-empty)"),
});

export const activeEditorSetRawTool = tool({
  description: "Set the entire content of the active editor with raw text",
  inputSchema: InputSchema,
  execute: ({ content }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    const view = sdk.window.getActiveEditor()?.getEditorView();

    if (view === undefined) {
      return {
        success: false,
        error: "No active editor view found",
      };
    }

    try {
      const normalizedContent = content.replace(/\r?\n/g, "\r\n");

      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: normalizedContent,
        },
      });
      view.focus();

      return {
        success: true,
        frontend_message: `Content set in active editor`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to set content: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
});
