import { tool } from "ai";
import { z } from "zod";

import { ActionResult, type FloatToolContext } from "@/float/types";

const inputSchema = z.object({
  query: z
    .string()
    .describe("The query to set for the HTTPQL filter (non-empty). Follow strictly HTTPQL syntax."),
});

export const httpqlQuerySetTool = tool({
  description:
    "Set the query for the HTTPQL filter on the HTTP History tab. This will navigate to the HTTP History tab and set the query.",
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: ({ query }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    sdk.httpHistory.setQuery(query);
    return ActionResult.ok("Query set successfully");
  },
});
