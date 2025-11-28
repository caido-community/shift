import { z } from "zod";

import { actionError, hostedFileConfirmation } from "@/float/actionUtils";
import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

export const createHostedFileSchema = z.object({
  name: z.literal("createHostedFile"),
  parameters: z.object({
    file_name: z.string().describe("Name of the file to create (non-empty)"),
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
      hostedFileConfirmation(sdk, {
        fileName: file_name,
        content,
      });

      return {
        success: true,
        frontend_message: "",
      };
    } catch (error) {
      return actionError("Failed to create hosted file", error);
    }
  },
};
