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

export const activeEditorAddQueryParameterSchema = z.object({
  name: z.literal("activeEditorAddQueryParameter"),
  parameters: z.object({
    paramName: z.string().describe("Query parameter name (non-empty)"),
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
      { paramName, value }: ActiveEditorAddQueryParameterInput["parameters"],
    ) =>
      withActiveEditorView(sdk, (view) => {
        try {
          const currentText = view.state.doc.toString();

          const modifiedRequest = HttpForge.create(currentText)
            .addQueryParam(paramName, value)
            .build();

          replaceEditorContent(view, modifiedRequest);

          return actionSuccess(
            `Query parameter ${paramName} added in active editor`,
          );
        } catch (error) {
          return actionError("Failed to modify query parameter", error);
        }
      }),
  };
