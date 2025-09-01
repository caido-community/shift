import { z } from "zod";

import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";
import { showConfirmationDialog } from "@/utils";

export const createHostedFileAdvancedSchema = z.object({
  name: z.literal("createHostedFileAdvanced"),
  parameters: z.object({
    file_name: z.string().min(1).describe("Name of the file to create"),
    js_script: z
      .string()
      .describe(
        "JavaScript code to execute. The result will be used as file content",
      ),
  }),
});

export type CreateHostedFileAdvancedInput = z.infer<
  typeof createHostedFileAdvancedSchema
>;

export const createHostedFileAdvanced: ActionDefinition<CreateHostedFileAdvancedInput> =
  {
    name: "createHostedFileAdvanced",
    description:
      "Create a hosted file by executing JavaScript code to generate content. Use this for generating large payloads, sequences (e.g., 100 numbers), encoded data, or complex wordlists. For simple wordlists with few lines, use the basic createHostedFile tool instead.",
    inputSchema: createHostedFileAdvancedSchema,
    execute: (
      sdk: FrontendSDK,
      { file_name, js_script }: CreateHostedFileAdvancedInput["parameters"],
    ) => {
      try {
        let content: string;

        try {
          const result = eval(js_script);
          content = String(result);
        } catch (evalError) {
          return {
            success: false,
            error: `Failed to execute JavaScript: ${
              evalError instanceof Error ? evalError.message : "Unknown error"
            }`,
          };
        }
        const dialog = showConfirmationDialog(sdk, {
          fileName: file_name,
          content,
          onConfirm: async (content) => {
            dialog.close();

            const file = new File([content], file_name);
            const result = await sdk.files.create(file);

            if (result === undefined) {
              sdk.window.showToast("Failed to create file", {
                variant: "error",
              });

              return;
            }

            sdk.window.showToast("File created successfully", {
              variant: "success",
            });
          },
        });

        return {
          success: true,
          frontend_message: "",
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to create hosted file: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        };
      }
    },
  };
