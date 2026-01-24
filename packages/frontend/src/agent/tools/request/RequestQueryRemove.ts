import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { truncate, withSuffix } from "@/utils";

const inputSchema = z.object({
  key: z.string().describe("The query parameter key to remove"),
});

const outputSchema = ToolResult.schema();

type RequestQueryRemoveInput = z.infer<typeof inputSchema>;
type RequestQueryRemoveOutput = ToolResultType;

export const display = {
  streaming: ({ input }) =>
    input
      ? [{ text: "Removing query param " }, { text: truncate(input.key), muted: true }]
      : [{ text: "Removing " }, { text: "query param", muted: true }],
  success: ({ input }) => [
    { text: "Removed query param " },
    { text: truncate(input?.key ?? "unknown"), muted: true },
  ],
  error: ({ input }) => `Failed to remove query param${withSuffix(input?.key)}`,
} satisfies ToolDisplay<RequestQueryRemoveInput>;

export const RequestQueryRemove = tool({
  description:
    "Remove a URL query parameter from the current HTTP request by its key name. Use this to test how the application behaves when expected parameters are missing, or to clean up the query string before adding different test values. If the parameter doesn't exist, the operation succeeds silently (no error). Removes all occurrences if the parameter appears multiple times. This tool will fail if no HTTP request is currently loaded.",
  inputSchema,
  outputSchema,
  execute: ({ key }, { experimental_context }): RequestQueryRemoveOutput => {
    const context = experimental_context as AgentContext;
    if (context.httpRequest === "") {
      return ToolResult.err("No HTTP request loaded");
    }
    const after = HttpForge.create(context.httpRequest).removeQueryParam(key).build();
    context.setHttpRequest(after);
    return ToolResult.ok({ message: `Query param "${key}" removed` });
  },
});
