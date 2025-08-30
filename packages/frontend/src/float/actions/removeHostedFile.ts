import { z } from "zod";

import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

export const removeHostedFileSchema = z.object({
  name: z.literal("removeHostedFile"),
  parameters: z.object({
    id: z.string().describe("ID of the file to remove"),
  }),
});

export type RemoveHostedFileInput = z.infer<typeof removeHostedFileSchema>;

export const removeHostedFile: ActionDefinition<RemoveHostedFileInput> = {
  name: "removeHostedFile",
  description: "Remove a hosted file by ID",
  inputSchema: removeHostedFileSchema,
  execute: async (
    sdk: FrontendSDK,
    { id }: RemoveHostedFileInput["parameters"],
  ) => {
    try {
      await sdk.files.delete(id);
    } catch (error) {
      return {
        success: false,
        error: `Failed to remove hosted file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }

    return {
      success: true,
      frontend_message: "Hosted file removed successfully",
    };
  },
};
