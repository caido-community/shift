import { z } from "zod";

import { runAction } from "@/float/actionUtils";
import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

const removeHostedFileSchema = z.object({
  name: z.literal("removeHostedFile"),
  parameters: z.object({
    id: z.string().describe("ID of the file to remove"),
  }),
});

type RemoveHostedFileInput = z.infer<typeof removeHostedFileSchema>;

export const removeHostedFile: ActionDefinition<RemoveHostedFileInput> = {
  name: "removeHostedFile",
  description: "Remove a hosted file by ID",
  inputSchema: removeHostedFileSchema,
  execute: async (
    sdk: FrontendSDK,
    { id }: RemoveHostedFileInput["parameters"],
  ) =>
    runAction(
      () => sdk.files.delete(id),
      "Hosted file removed successfully",
      "Failed to remove hosted file",
    ),
};
