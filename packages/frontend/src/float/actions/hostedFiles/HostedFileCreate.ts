import { tool } from "ai";
import { z } from "zod";

import {
  ActionResult,
  type ActionResult as ActionResultType,
  type FloatToolContext,
} from "@/float/types";
import { hostedFileConfirmation } from "@/float/utils";

const inputSchema = z.object({
  file_name: z.string().describe("Name of the file to create (non-empty)"),
  content: z.string().describe("Content of the file"),
});

export const hostedFileCreateTool = tool({
  description: "Create a new hosted file with specified name and content",
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: ({ file_name, content }, { experimental_context }): ActionResultType => {
    const { sdk } = experimental_context as FloatToolContext;
    hostedFileConfirmation(sdk, {
      fileName: file_name,
      content,
    });

    return ActionResult.ok("");
  },
});
