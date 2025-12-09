import { tool } from "ai";
import { z } from "zod";

import { runAction } from "@/float/actionUtils";
import { type FloatToolContext } from "@/float/types";

const InputSchema = z.object({
  id: z.string().describe("ID of the file to remove"),
});

export const removeHostedFileTool = tool({
  description: "Remove a hosted file by ID",
  inputSchema: InputSchema,
  execute: async ({ id }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    return runAction(
      () => sdk.files.delete(id),
      "Hosted file removed successfully",
      "Failed to remove hosted file",
    );
  },
});
