import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

export const activeEditorSetMethodSchema = z.object({
  name: z.literal("activeEditorSetMethod"),
  parameters: z.object({
    method: z
      .string()
      .describe("The HTTP method to set (e.g., GET, POST, PUT, DELETE)"),
  }),
});

export type ActiveEditorSetMethodInput = z.infer<
  typeof activeEditorSetMethodSchema
>;

export const activeEditorSetMethod: ActionDefinition<ActiveEditorSetMethodInput> =
  {
    name: "activeEditorSetMethod",
    description: "Set the HTTP method in the active editor",
    inputSchema: activeEditorSetMethodSchema,
    execute: (
      sdk: FrontendSDK,
      { method }: ActiveEditorSetMethodInput["parameters"],
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
          .method(method)
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
          frontend_message: `Method set to ${method} in active editor`,
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to set method: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        };
      }
    },
  };
