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
    ) =>
      withActiveEditorView(sdk, (view) => {
        try {
          const currentText = view.state.doc.toString();

          const modifiedRequest = HttpForge.create(currentText)
            .method(method)
            .build();

          replaceEditorContent(view, modifiedRequest);

          return actionSuccess(`Method set to ${method} in active editor`);
        } catch (error) {
          return actionError("Failed to set method", error);
        }
      }),
  };
