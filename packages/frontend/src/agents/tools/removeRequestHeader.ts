import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import { type ToolContext } from "@/agents/types";

const RemoveRequestHeaderSchema = z.object({
  name: z
    .string()
    .min(1)
    .describe("The header name to remove from the request"),
});

export const removeRequestHeaderTool = tool({
  description:
    "Remove an HTTP header from the current request. Use this to eliminate unwanted headers, remove authentication tokens, or test behavior without specific headers.",
  inputSchema: RemoveRequestHeaderSchema,
  execute: (input, { experimental_context }) => {
    const context = experimental_context as ToolContext;
    try {
      const hasChanged = context.replaySession.updateRequestRaw((draft) => {
        return HttpForge.create(draft).removeHeader(input.name).build();
      });

      return {
        message: hasChanged
          ? "Request has been updated"
          : "Request has not changed. No header found to remove.",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { error: `Failed to remove header: ${message}` };
    }
  },
});
