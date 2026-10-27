import { tool } from "ai";
import { z } from "zod";

import { ToolResult } from "@/agent/types";
import { type FloatToolContext } from "@/float/types";

const inputSchema = z.object({
  id: z.string().describe("ID of the filter to update (non-empty)"),
  appendQuery: z.string().describe("Text to append to the existing HTTPQL query (non-empty)"),
});

export const filterQueryAppendTool = tool({
  description: "Append text to the existing query of a filter by ID",
  inputSchema,
  outputSchema: ToolResult.schema(),
  execute: async ({ id, appendQuery }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    const filters = sdk.filters.getAll();
    const filter = filters.find((f) => f.id === id);
    if (!filter) {
      return ToolResult.err("Filter not found");
    }

    const suffix = filter.query.startsWith(" ") ? appendQuery : ` ${appendQuery}`;

    const updatedQuery = filter.query + suffix;

    try {
      await sdk.filters.update(id, {
        name: filter.name,
        alias: filter.alias,
        query: updatedQuery,
      });

      return ToolResult.ok({ message: `Query appended to filter ${id} successfully` });
    } catch (error) {
      return ToolResult.err(
        "Failed to update filter",
        error instanceof Error ? error.message : undefined
      );
    }
  },
});
