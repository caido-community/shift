import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

export const activeEditorAddQueryParameterSchema = z.object({
  name: z.literal("activeEditorAddQueryParameter"),
  parameters: z.object({
    name: z.string().min(1).describe("Query parameter name"),
    value: z.string().describe("Query parameter value"),
  }),
});

export type ActiveEditorAddQueryParameterInput = z.infer<
  typeof activeEditorAddQueryParameterSchema
>;

export const activeEditorAddQueryParameter: ActionDefinition<ActiveEditorAddQueryParameterInput> =
  {
    name: "activeEditorAddQueryParameter",
    description:
      "Add or update a query parameter in the HTTP request URL in the active editor",
    inputSchema: activeEditorAddQueryParameterSchema,
    execute: (
      sdk: FrontendSDK,
      { name, value }: ActiveEditorAddQueryParameterInput["parameters"],
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
          .addQueryParam(name, value)
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
          frontend_message: `Query parameter ${name} added in active editor`,
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to modify query parameter: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        };
      }
    },
  };
