import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

export const activeEditorAddHeaderSchema = z.object({
  name: z.literal("activeEditorAddHeader"),
  parameters: z.object({
    header: z.string().min(1).describe("Header in format 'Name: Value'"),
    replace: z
      .boolean()
      .default(true)
      .describe("Replace existing header with same name if it exists"),
  }),
});

export type ActiveEditorAddHeaderInput = z.infer<
  typeof activeEditorAddHeaderSchema
>;

export const activeEditorAddHeader: ActionDefinition<ActiveEditorAddHeaderInput> =
  {
    name: "activeEditorAddHeader",
    description: "Add or replace an HTTP header in the active editor",
    inputSchema: activeEditorAddHeaderSchema,
    execute: (
      sdk: FrontendSDK,
      { header, replace }: ActiveEditorAddHeaderInput["parameters"],
    ) => {
      const view = sdk.window.getActiveEditor()?.getEditorView();

      if (view === undefined) {
        return {
          success: false,
          error: "No active editor view found",
        };
      }

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
          frontend_message: `Header ${headerName} ${replace ? "set" : "added"} in active editor`,
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to modify header: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    },
  };
