import { tool } from "ai";
import { z } from "zod";

import { actionError, hostedFileConfirmation } from "@/float/actionUtils";
import { type FloatToolContext } from "@/float/types";

const InputSchema = z.object({
  file_name: z.string().describe("Name of the file to create (non-empty)"),
  content: z.string().describe("Content of the file"),
});

export const createHostedFileTool = tool({
  description: "Create a new hosted file with specified name and content",
  inputSchema: InputSchema,
  execute: ({ file_name, content }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
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
});
