import { z } from "zod";

import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

const activeEditorSetRawSchema = z.object({
  name: z.literal("activeEditorSetRaw"),
  parameters: z.object({
    content: z
      .string()
      .describe("Raw content to set in the active editor (non-empty)"),
  }),
});

type ActiveEditorSetRawInput = z.infer<typeof activeEditorSetRawSchema>;

export const activeEditorSetRaw: ActionDefinition<ActiveEditorSetRawInput> = {
  name: "activeEditorSetRaw",
  description: "Set the entire content of the active editor with raw text",
  inputSchema: activeEditorSetRawSchema,
  execute: (
    sdk: FrontendSDK,
    { content }: ActiveEditorSetRawInput["parameters"],
  ) => {
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
};
