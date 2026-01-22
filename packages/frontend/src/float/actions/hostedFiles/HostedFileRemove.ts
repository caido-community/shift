import { tool } from "ai";
import { z } from "zod";

import { ActionResult, type FloatToolContext } from "@/float/types";

const inputSchema = z.object({
  id: z.string().describe("ID of the file to remove"),
});

export const hostedFileRemoveTool = tool({
  description: "Remove a hosted file by ID",
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: async ({ id }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    await sdk.files.delete(id);
    return ActionResult.ok("Hosted file removed successfully");
  },
});
