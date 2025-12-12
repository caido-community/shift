import { tool } from "ai";
import { z } from "zod";

import { actionError, actionSuccess } from "@/float/actionUtils";
import { type FloatToolContext } from "@/float/types";

const InputSchema = z.object({
  id: z.string().describe("ID of the filter to update (non-empty)"),
  appendQuery: z
    .string()
    .describe("Text to append to the existing HTTPQL query (non-empty)"),
});

export const filterAppendQueryTool = tool({
  description: "Append text to the existing query of a filter by ID",
  inputSchema: InputSchema,
  execute: async ({ id, appendQuery }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    try {
      const filters = sdk.filters.getAll();
      const filter = filters.find((f) => f.id === id);
      if (!filter) {
        return {
          success: false,
          error: "Filter not found",
        };
      }

      const suffix = filter.query.startsWith(" ")
        ? appendQuery
        : ` ${appendQuery}`;

      const updatedQuery = filter.query + suffix;
      await sdk.filters.update(id, {
        name: filter.name,
        alias: filter.alias,
        query: updatedQuery,
      });
    } catch (error) {
      return actionError("Failed to append to filter query", error);
    }

    return actionSuccess(`Query appended to filter ${id} successfully`);
  },
});
