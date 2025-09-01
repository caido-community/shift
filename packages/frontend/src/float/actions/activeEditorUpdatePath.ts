import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

export const activeEditorUpdatePathSchema = z.object({
  name: z.literal("activeEditorUpdatePath"),
  parameters: z.object({
    path: z
      .string()
      .min(1)
      .describe("New path for the HTTP request, preserving query parameters"),
  }),
});

export type ActiveEditorUpdatePathInput = z.infer<
  typeof activeEditorUpdatePathSchema
>;

export const activeEditorUpdatePath: ActionDefinition<ActiveEditorUpdatePathInput> =
  {
    name: "activeEditorUpdatePath",
    description:
      "Update the path portion of the HTTP request URL in the active editor while preserving query parameters",
    inputSchema: activeEditorUpdatePathSchema,
    execute: (
      sdk: FrontendSDK,
      { path }: ActiveEditorUpdatePathInput["parameters"],
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
          .path(path)
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
          frontend_message: `Path replaced in active editor`,
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to replace path: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        };
      }
    },
  };
