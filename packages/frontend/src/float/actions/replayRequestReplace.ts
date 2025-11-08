import { z } from "zod";

import { actionError, actionSuccess, withActiveEditorView } from "@/float/actionUtils";
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
    ) =>
      withActiveEditorView(sdk, (view) => {
        try {
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: text },
          });
        } catch (error) {
          return actionError(
            "Failed to replace request in replay editor",
            error,
          );
        }

        return actionSuccess("Request replaced in replay editor");
      }),
  };
