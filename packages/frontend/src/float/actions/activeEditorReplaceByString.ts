import { z } from "zod";

import {
  actionError,
  actionSuccess,
  replaceEditorContent,
  withActiveEditorView,
} from "@/float/actionUtils";
import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

export const activeEditorReplaceByStringSchema = z.object({
  name: z.literal("activeEditorReplaceByString"),
  parameters: z.object({
    match: z
      .string()
      .min(1)
      .describe("Substring or pattern to replace (literal)"),
    replace: z.string().describe("Replacement text"),
  }),
});

export type ActiveEditorReplaceByStringInput = z.infer<
  typeof activeEditorReplaceByStringSchema
>;

export const activeEditorReplaceByString: ActionDefinition<ActiveEditorReplaceByStringInput> =
  {
    name: "activeEditorReplaceByString",
    description:
      "Replace all literal occurrences in the active editor and focus it",
    inputSchema: activeEditorReplaceByStringSchema,
    execute: (
      sdk: FrontendSDK,
      { match, replace }: ActiveEditorReplaceByStringInput["parameters"],
    ) =>
      withActiveEditorView(sdk, (view) => {
        try {
          const currentText = view.state.doc.toJSON().join("\r\n");
          const newText = currentText.replace(match, replace);

          replaceEditorContent(view, newText);

          return actionSuccess("Text replaced in active editor");
        } catch (error) {
          return actionError("Failed to replace text", error);
        }
      }),
  };
