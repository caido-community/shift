import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { truncate, withSuffix } from "@/utils";

const inputSchema = z.object({
  key: z.string().describe("The query parameter key to remove"),
});

const valueSchema = z.object({
  before: z.string(),
  after: z.string(),
});

const outputSchema = ToolResult.schema(valueSchema);

type RequestQueryRemoveInput = z.infer<typeof inputSchema>;
type RequestQueryRemoveValue = z.infer<typeof valueSchema>;
type RequestQueryRemoveOutput = ToolResultType<RequestQueryRemoveValue>;

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
} satisfies ToolDisplay<RequestQueryRemoveInput, RequestQueryRemoveValue>;

export const RequestQueryRemove = tool({
  description: "Remove a query parameter from the current HTTP request",
  inputSchema,
  outputSchema,
  execute: ({ key }, { experimental_context }): RequestQueryRemoveOutput => {
    const context = experimental_context as AgentContext;
    const before = context.httpRequest;
    if (before === "") {
      return ToolResult.err("No HTTP request loaded");
    }
    const after = HttpForge.create(before).removeQueryParam(key).build();
    context.setHttpRequest(after);
    return ToolResult.ok({ message: `Query param "${key}" removed`, before, after });
  },
});
