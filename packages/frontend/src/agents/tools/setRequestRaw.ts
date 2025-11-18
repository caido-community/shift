import { tool } from "ai";
import { z } from "zod";

import { type ToolContext } from "@/agents/types";
import { substituteEnvironmentVariables } from "@/agents/utils/substituteEnvironmentVariables";

const SetRequestRawSchema = z.object({
  raw: z
    .string()
    .describe(
      "The raw HTTP request content to set. Use normal line breaks, not CRLF - it will be converted to CRLF by the system. Supports environment variable substitution.",
    ),
});

export const setRequestRawTool = tool({
  description:
    "Replace the entire raw HTTP request with custom content. This is an advanced tool - use this only when you need to craft malformed requests, test HTTP parsing vulnerabilities, or make modifications that other tools cannot handle.",
  inputSchema: SetRequestRawSchema,
  execute: async (input, { experimental_context }) => {
    const context = experimental_context as ToolContext;
    try {
      const raw = await substituteEnvironmentVariables(input.raw, context);

      const hasChanged = context.replaySession.updateRequestRaw(() => {
        const normalized = raw.replace(/\r?\n/g, "\r\n");
        return normalized;
      });

      return {
        message: hasChanged
          ? "Request has been updated"
          : "Request has not changed",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { error: `Failed to set raw request: ${message}` };
    }
  },
});
