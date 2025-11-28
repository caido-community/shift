import { z } from "zod";

import { actionSuccess, withActiveEditor } from "@/float/actionUtils";
import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

export const activeEditorReplaceSelectionSchema = z.object({
  name: z.literal("activeEditorReplaceSelection"),
  parameters: z.object({
    text: z
      .string()
      .describe("Text to insert in place of current selection (non-empty)"),
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
    ) =>
      withActiveEditor(sdk, (editor) => {
        editor.replaceSelectedText(text);
        editor.focus();

        return actionSuccess("Selection replaced in active editor");
      }),
  };
