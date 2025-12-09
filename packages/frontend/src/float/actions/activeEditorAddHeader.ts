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

const activeEditorAddHeaderSchema = z.object({
  name: z.literal("activeEditorAddHeader"),
  parameters: z.object({
    header: z.string().describe("Header in format 'Name: Value' (non-empty)"),
    replace: z
      .boolean()
      .describe("Replace existing header with same name if it exists"),
  }),
});

type ActiveEditorAddHeaderInput = z.infer<typeof activeEditorAddHeaderSchema>;

export const activeEditorAddHeader: ActionDefinition<ActiveEditorAddHeaderInput> =
  {
    name: "activeEditorAddHeader",
    description: "Add or replace an HTTP header in the active editor",
    inputSchema: activeEditorAddHeaderSchema,
    execute: (
      sdk: FrontendSDK,
      { header, replace }: ActiveEditorAddHeaderInput["parameters"],
    ) =>
      withActiveEditorView(sdk, (view) => {
        const headerParts = header.split(":");
        if (headerParts.length < 2) {
          return {
            success: false,
            error: "Header must be in format 'Name: Value'",
          };
        }

        const headerName = headerParts[0]?.trim();
        if (headerName === undefined) {
          return {
            success: false,
            error: "Header name is undefined",
          };
        }

        const headerValue = headerParts.slice(1).join(":").trim();

        try {
          const currentText = view.state.doc.toString();
          let modifiedRequest: string;

          if (replace) {
            modifiedRequest = HttpForge.create(currentText)
              .setHeader(headerName, headerValue)
              .build();
          } else {
            modifiedRequest = HttpForge.create(currentText)
              .addHeader(headerName, headerValue)
              .build();
          }

          replaceEditorContent(view, modifiedRequest);

          return actionSuccess(
            `Header ${headerName} ${replace ? "set" : "added"} in active editor`,
          );
        } catch (error) {
          return actionError("Failed to modify header", error);
        }
      }),
  };
