import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

export const activeEditorRemoveQueryParameterSchema = z.object({
  name: z.literal("activeEditorRemoveQueryParameter"),
  parameters: z.object({
    name: z.string().min(1).describe("Query parameter name to remove"),
  }),
});

export type ActiveEditorRemoveQueryParameterInput = z.infer<
  typeof activeEditorRemoveQueryParameterSchema
>;

export const activeEditorRemoveQueryParameter: ActionDefinition<ActiveEditorRemoveQueryParameterInput> =
  {
    name: "activeEditorRemoveQueryParameter",
    description:
      "Remove a query parameter from the HTTP request URL in the active editor",
    inputSchema: activeEditorRemoveQueryParameterSchema,
    execute: (
      sdk: FrontendSDK,
      { name }: ActiveEditorRemoveQueryParameterInput["parameters"],
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
          .removeQueryParam(name)
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
          frontend_message: `Query parameter ${name} removed from active editor`,
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to remove query parameter: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        };
      }
    },
  };
