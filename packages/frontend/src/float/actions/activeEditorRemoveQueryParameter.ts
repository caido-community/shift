import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import {
  actionError,
  actionSuccess,
  replaceEditorContent,
  withActiveEditorView,
} from "@/float/actionUtils";
import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

export const activeEditorRemoveQueryParameterSchema = z.object({
  name: z.literal("activeEditorRemoveQueryParameter"),
  parameters: z.object({
    paramName: z
      .string()
      .describe("Query parameter name to remove (non-empty)"),
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
      { paramName }: ActiveEditorRemoveQueryParameterInput["parameters"],
    ) =>
      withActiveEditorView(sdk, (view) => {
        try {
          const currentText = view.state.doc.toString();

          const modifiedRequest = HttpForge.create(currentText)
            .removeQueryParam(paramName)
            .build();

          replaceEditorContent(view, modifiedRequest);

          return actionSuccess(
            `Query parameter ${paramName} removed from active editor`,
          );
        } catch (error) {
          return actionError("Failed to remove query parameter", error);
        }
      }),
  };
