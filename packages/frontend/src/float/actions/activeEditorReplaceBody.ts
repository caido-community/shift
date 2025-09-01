import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

export const activeEditorReplaceBodySchema = z.object({
  name: z.literal("activeEditorReplaceBody"),
  parameters: z.object({
    body: z
      .string()
      .describe("The new body content to replace everything after headers"),
  }),
});

export type ActiveEditorReplaceBodyInput = z.infer<
  typeof activeEditorReplaceBodySchema
>;

export const activeEditorReplaceBody: ActionDefinition<ActiveEditorReplaceBodyInput> =
  {
    name: "activeEditorReplaceBody",
    description:
      "Replace the HTTP body content in the active editor, preserving headers",
    inputSchema: activeEditorReplaceBodySchema,
    execute: (
      sdk: FrontendSDK,
      { body }: ActiveEditorReplaceBodyInput["parameters"],
    ) => {
      const view = sdk.window.getActiveEditor()?.getEditorView();

      if (view === undefined) {
        return {
          success: false,
          error: "No active editor view found",
        };
      }

      try {
        const currentText = view.state.doc.toString();

        const modifiedRequest = HttpForge.create(currentText)
          .body(body)
          .build();

        view.dispatch({
          changes: {
            from: 0,
            to: view.state.doc.length,
            insert: modifiedRequest,
          },
        });
        view.focus();

        return {
          success: true,
          frontend_message: `Body replaced in active editor`,
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to replace body: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        };
      }
    },
  };
