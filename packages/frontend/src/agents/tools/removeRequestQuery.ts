import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import { type ToolContext } from "@/agents/types";

const RemoveRequestQuerySchema = z.object({
  name: z
    .string()
    .min(1)
    .describe("The query parameter name to remove from the request URL"),
});

export const removeRequestQueryTool = tool({
  description:
    "Remove a query parameter from the current HTTP request URL. Use this to eliminate unwanted parameters, test behavior without specific query data, or simplify requests.",
  inputSchema: RemoveRequestQuerySchema,
  execute: (input, { experimental_context }) => {
    const context = experimental_context as ToolContext;
    try {
      const hasChanged = context.replaySession.updateRequestRaw((draft) => {
        return HttpForge.create(draft).removeQueryParam(input.name).build();
      });

      return {
        message: hasChanged
          ? "Request has been updated"
          : "Request has not changed. No query parameter found to remove.",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { error: `Failed to remove query parameter: ${message}` };
    }
  },
});
