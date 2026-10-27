import { tool } from "ai";
import { z } from "zod";

import { ToolResult } from "@/agent/types";
import { type FloatToolContext } from "@/float/types";

const inputSchema = z.object({
  filterName: z.string().describe("Name of the filter (non-empty)"),
  query: z.string().describe("HTTPQL query for the filter (non-empty)"),
  alias: z.string().describe("Alias for the filter (non-empty)"),
});

export const filterAddTool = tool({
  description: "Create a new filter with specified name, query, and alias",
  inputSchema,
  outputSchema: ToolResult.schema(),
  execute: async ({ filterName, query, alias }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;

    try {
      const newFilter = await sdk.filters.create({
        name: filterName,
        query,
        alias,
      });
      if (newFilter === undefined) {
        return ToolResult.err("Failed to create filter");
      }

      return ToolResult.ok({ message: `Filter ${filterName} created successfully` });
    } catch (error) {
      return ToolResult.err(
        "Failed to create filter",
        error instanceof Error ? error.message : undefined
      );
    }
  },
});
