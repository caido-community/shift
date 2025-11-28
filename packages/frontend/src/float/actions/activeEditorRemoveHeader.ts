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

export const activeEditorRemoveHeaderSchema = z.object({
  name: z.literal("activeEditorRemoveHeader"),
  parameters: z.object({
    headerName: z
      .string()
      .describe("Name of the header to remove (case-insensitive, non-empty)"),
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
    ) =>
      withActiveEditorView(sdk, (view) => {
        try {
          const currentText = view.state.doc.toString();

          const modifiedRequest = HttpForge.create(currentText)
            .removeHeader(headerName)
            .build();

          replaceEditorContent(view, modifiedRequest);

          return actionSuccess(
            `Header ${headerName} removed from active editor`,
          );
        } catch (error) {
          return actionError("Failed to remove header", error);
        }
      }),
  };
