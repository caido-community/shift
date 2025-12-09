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

const activeEditorUpdatePathSchema = z.object({
  name: z.literal("activeEditorUpdatePath"),
  parameters: z.object({
    path: z
      .string()
      .describe(
        "New path for the HTTP request (non-empty), preserving query parameters",
      ),
  }),
});

type ActiveEditorUpdatePathInput = z.infer<typeof activeEditorUpdatePathSchema>;

export const activeEditorUpdatePath: ActionDefinition<ActiveEditorUpdatePathInput> =
  {
    name: "activeEditorUpdatePath",
    description:
      "Update the path portion of the HTTP request URL in the active editor while preserving query parameters",
    inputSchema: activeEditorUpdatePathSchema,
    execute: (
      sdk: FrontendSDK,
      { path }: ActiveEditorUpdatePathInput["parameters"],
    ) =>
      withActiveEditorView(sdk, (view) => {
        try {
          const currentText = view.state.doc.toString();

          const modifiedRequest = HttpForge.create(currentText)
            .path(path)
            .build();

          replaceEditorContent(view, modifiedRequest);

          return actionSuccess(`Path replaced in active editor`);
        } catch (error) {
          return actionError("Failed to replace path", error);
        }
      }),
  };
