import { z } from "zod";

import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";
import { showConfirmationDialog } from "@/utils";

export const createHostedFileSchema = z.object({
  name: z.literal("createHostedFile"),
  parameters: z.object({
    file_name: z.string().min(1).describe("Name of the file to create"),
    content: z.string().describe("Content of the file"),
  }),
});

export type CreateHostedFileInput = z.infer<typeof createHostedFileSchema>;

export const createHostedFile: ActionDefinition<CreateHostedFileInput> = {
  name: "createHostedFile",
  description: "Create a new hosted file with specified name and content",
  inputSchema: createHostedFileSchema,
  execute: (
    sdk: FrontendSDK,
    { file_name, content }: CreateHostedFileInput["parameters"],
  ) => {
    try {
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
