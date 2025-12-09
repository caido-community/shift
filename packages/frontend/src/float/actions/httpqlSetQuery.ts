import { tool } from "ai";
import { z } from "zod";

import { actionError, actionSuccess } from "@/float/actionUtils";
import { type FloatToolContext } from "@/float/types";

const InputSchema = z.object({
  query: z
    .string()
    .describe(
      "The query to set for the HTTPQL filter (non-empty). Follow strictly HTTPQL syntax.",
    ),
});

export const httpqlSetQueryTool = tool({
  description: "Set the query for the HTTPQL filter",
  inputSchema: InputSchema,
  execute: ({ query }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    try {
      sdk.httpHistory.setQuery(query);

      return actionSuccess("Query set successfully");
    } catch (error) {
      return actionError("Failed to set query", error);
    }
  },
});
