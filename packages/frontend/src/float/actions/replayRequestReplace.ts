import { z } from "zod";

import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

export const replayRequestReplaceSchema = z.object({
  name: z.literal("replayRequestReplace"),
  parameters: z.object({
    text: z
      .string()
      .describe("Complete raw HTTP request text to replace in replay editor"),
  }),
});

export type ReplayRequestReplaceInput = z.infer<
  typeof replayRequestReplaceSchema
>;

export const replayRequestReplace: ActionDefinition<ReplayRequestReplaceInput> =
  {
    name: "replayRequestReplace",
    description:
      "Replace the entire request content in the current replay tab editor",
    inputSchema: replayRequestReplaceSchema,
    execute: (
      sdk: FrontendSDK,
      { text }: ReplayRequestReplaceInput["parameters"],
    ) => {
      const view = sdk.window.getActiveEditor()?.getEditorView();

      if (view === undefined) {
        return {
          success: false,
          error: "No active editor view found",
        };
      }

      try {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: text },
        });
      } catch (error) {
        return {
          success: false,
          error: `Failed to replace request in replay editor: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        };
      }

      return {
        success: true,
        frontend_message: "Request replaced in replay editor",
      };
    },
  };
