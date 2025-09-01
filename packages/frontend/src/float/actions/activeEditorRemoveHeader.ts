import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

export const activeEditorRemoveHeaderSchema = z.object({
  name: z.literal("activeEditorRemoveHeader"),
  parameters: z.object({
    headerName: z
      .string()
      .min(1)
      .describe("Name of the header to remove (case-insensitive)"),
  }),
});

export type ActiveEditorRemoveHeaderInput = z.infer<
  typeof activeEditorRemoveHeaderSchema
>;

export const activeEditorRemoveHeader: ActionDefinition<ActiveEditorRemoveHeaderInput> =
  {
    name: "activeEditorRemoveHeader",
    description: "Remove an HTTP header from the active editor by name",
    inputSchema: activeEditorRemoveHeaderSchema,
    execute: (
      sdk: FrontendSDK,
      { headerName }: ActiveEditorRemoveHeaderInput["parameters"],
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
          .removeHeader(headerName)
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
          frontend_message: `Header ${headerName} removed from active editor`,
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to remove header: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        };
      }
    },
  };
