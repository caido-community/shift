import { tool } from "ai";
import { z } from "zod";

import { actionError, actionSuccess } from "@/float/actionUtils";
import { type FloatToolContext } from "@/float/types";

const InputSchema = z.object({
  filterName: z.string().describe("Name of the filter (non-empty)"),
  query: z.string().describe("HTTPQL query for the filter (non-empty)"),
  alias: z.string().describe("Alias for the filter (non-empty)"),
});

export const addFilterTool = tool({
  description: "Create a new filter with specified name, query, and alias",
  inputSchema: InputSchema,
  execute: async ({ filterName, query, alias }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    try {
      const newFilter = await sdk.filters.create({
        name: filterName,
        query,
        alias,
      });
      if (newFilter === undefined) {
        return {
          success: false,
          error: "Failed to create filter",
        };
      }

      return actionSuccess(`Filter ${filterName} created successfully`);
    } catch (error) {
      return actionError("Failed to create filter", error);
    }
  },
});
