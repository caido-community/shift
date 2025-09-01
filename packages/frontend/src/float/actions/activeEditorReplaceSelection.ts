import { z } from "zod";

import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

export const activeEditorReplaceSelectionSchema = z.object({
  name: z.literal("activeEditorReplaceSelection"),
  parameters: z.object({
    text: z
      .string()
      .min(1)
      .describe("Text to insert in place of current selection"),
  }),
});

export type ActiveEditorReplaceSelectionInput = z.infer<
  typeof activeEditorReplaceSelectionSchema
>;

export const activeEditorReplaceSelection: ActionDefinition<ActiveEditorReplaceSelectionInput> =
  {
    name: "activeEditorReplaceSelection",
    description: "Replace current selection in the active editor and focus it",
    inputSchema: activeEditorReplaceSelectionSchema,
    execute: (
      sdk: FrontendSDK,
      { text }: ActiveEditorReplaceSelectionInput["parameters"],
    ) => {
      const editor = sdk.window.getActiveEditor();

      if (editor === undefined) {
        return {
          success: false,
          error: "No active editor found",
        };
      }

      editor.replaceSelectedText(text);
      editor.focus();

      return {
        success: true,
        frontend_message: "Selection replaced in active editor",
      };
    },
  };
