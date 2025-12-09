import { tool } from "ai";
import { z } from "zod";

import { runAction } from "@/float/actionUtils";
import { type FloatToolContext } from "@/float/types";

const InputSchema = z.object({
  id: z.string().describe("ID of the filter to delete"),
});

export const deleteFilterTool = tool({
  description: "Delete a filter by ID",
  inputSchema: InputSchema,
  execute: async ({ id }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    return runAction(
      () => sdk.filters.delete(id),
      "Filter deleted successfully",
      "Failed to delete filter",
    );
  },
});
