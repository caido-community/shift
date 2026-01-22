import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { truncate, withSuffix } from "@/utils";

const inputSchema = z.object({
  name: z.string().describe("The cookie name to remove"),
});

const valueSchema = z.object({
  before: z.string(),
  after: z.string(),
});

const outputSchema = ToolResult.schema(valueSchema);

type RequestCookieRemoveInput = z.infer<typeof inputSchema>;
type RequestCookieRemoveValue = z.infer<typeof valueSchema>;
type RequestCookieRemoveOutput = ToolResultType<RequestCookieRemoveValue>;

export const display = {
  streaming: ({ input }) =>
    input
      ? [{ text: "Removing cookie " }, { text: truncate(input.name), muted: true }]
      : [{ text: "Removing " }, { text: "cookie", muted: true }],
  success: ({ input }) => [
    { text: "Removed cookie " },
    { text: truncate(input?.name ?? "unknown"), muted: true },
  ],
  error: ({ input }) => `Failed to remove cookie${withSuffix(input?.name)}`,
} satisfies ToolDisplay<RequestCookieRemoveInput, RequestCookieRemoveValue>;

export const RequestCookieRemove = tool({
  description: "Remove a cookie from the current HTTP request",
  inputSchema,
  outputSchema,
  execute: ({ name }, { experimental_context }): RequestCookieRemoveOutput => {
    const context = experimental_context as AgentContext;
    const before = context.httpRequest;
    if (before === "") {
      return ToolResult.err("No HTTP request loaded");
    }
    const after = HttpForge.create(before).removeCookie(name).build();
    context.setHttpRequest(after);
    return ToolResult.ok({ message: `Cookie "${name}" removed`, before, after });
  },
});
