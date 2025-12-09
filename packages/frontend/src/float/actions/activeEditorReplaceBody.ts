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

const activeEditorReplaceBodySchema = z.object({
  name: z.literal("activeEditorReplaceBody"),
  parameters: z.object({
    body: z
      .string()
      .describe("The new body content to replace everything after headers"),
  }),
});

type ActiveEditorReplaceBodyInput = z.infer<
  typeof activeEditorReplaceBodySchema
>;

export const activeEditorReplaceBody: ActionDefinition<ActiveEditorReplaceBodyInput> =
  {
    name: "activeEditorReplaceBody",
    description:
      "Replace the HTTP body content in the active editor, preserving headers",
    inputSchema: activeEditorReplaceBodySchema,
    execute: (
      sdk: FrontendSDK,
      { body }: ActiveEditorReplaceBodyInput["parameters"],
    ) =>
      withActiveEditorView(sdk, (view) => {
        try {
          const currentText = view.state.doc.toString();

          const modifiedRequest = HttpForge.create(currentText)
            .body(body)
            .build();

          replaceEditorContent(view, modifiedRequest);

          return actionSuccess(`Body replaced in active editor`);
        } catch (error) {
          return actionError("Failed to replace body", error);
        }
      }),
  };
