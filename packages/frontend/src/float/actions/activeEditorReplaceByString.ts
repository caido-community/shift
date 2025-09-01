import { z } from "zod";

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
    ) => {
      const view = sdk.window.getActiveEditor()?.getEditorView();

      if (view === undefined) {
        return {
          success: false,
          error: "No active editor view found",
        };
      }

      try {
        const currentText = view.state.doc.toJSON().join("\r\n");
        const newText = currentText.replace(match, replace);

        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: newText },
        });
        view.focus();

        return {
          success: true,
          frontend_message: "Text replaced in active editor",
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to replace text: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        };
      }
    },
  };
