import { tool } from "ai";
import { z } from "zod";

import { ActionResult, type FloatToolContext } from "@/float/types";

const inputSchema = z.object({
  filterName: z.string().describe("Name of the filter (non-empty)"),
  query: z.string().describe("HTTPQL query for the filter (non-empty)"),
  alias: z.string().describe("Alias for the filter (non-empty)"),
});

export const filterAddTool = tool({
  description: "Create a new filter with specified name, query, and alias",
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: async ({ filterName, query, alias }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;

    try {
      const newFilter = await sdk.filters.create({
        name: filterName,
        query,
        alias,
      });
      if (newFilter === undefined) {
        return ActionResult.err("Failed to create filter");
      }

      return ActionResult.ok(`Filter ${filterName} created successfully`);
    } catch (error) {
      return ActionResult.err(
        "Failed to create filter",
        error instanceof Error ? error.message : undefined
      );
    }
  },
});
