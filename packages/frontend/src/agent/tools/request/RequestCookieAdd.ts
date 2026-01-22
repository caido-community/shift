import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { resolveEnvironmentVariables } from "@/agent/utils/environment";
import { truncate, withSuffix } from "@/utils";

const inputSchema = z.object({
  name: z.string().describe("The cookie name"),
  value: z.string().describe("The cookie value. Supports environment variable substitution"),
});

const valueSchema = z.object({
  before: z.string(),
  after: z.string(),
});

const outputSchema = ToolResult.schema(valueSchema);

type RequestCookieAddInput = z.infer<typeof inputSchema>;
type RequestCookieAddValue = z.infer<typeof valueSchema>;
type RequestCookieAddOutput = ToolResultType<RequestCookieAddValue>;

export const display = {
  streaming: ({ input }) =>
    input
      ? [{ text: "Adding " }, { text: truncate(input.name), muted: true }]
      : [{ text: "Adding " }, { text: "cookie", muted: true }],
  success: ({ input }) =>
    input
      ? [
          { text: "Added cookie " },
          { text: truncate(input.name), muted: true },
          { text: " with value " },
          { text: truncate(input.value), muted: true },
        ]
      : [{ text: "Added cookie" }, { text: "cookie", muted: true }],
  error: ({ input }) => `Failed to add cookie${withSuffix(input?.name)}`,
} satisfies ToolDisplay<RequestCookieAddInput, RequestCookieAddValue>;

export const RequestCookieAdd = tool({
  description: "Add a new cookie to the current HTTP request.",
  inputSchema,
  outputSchema,
  execute: async ({ name, value }, { experimental_context }): Promise<RequestCookieAddOutput> => {
    const context = experimental_context as AgentContext;
    const before = context.httpRequest;
    if (before === "") {
      return ToolResult.err("No HTTP request loaded");
    }
    const resolvedValue = await resolveEnvironmentVariables(context.sdk, value);
    const after = HttpForge.create(before).addCookie(name, resolvedValue).build();
    context.setHttpRequest(after);
    return ToolResult.ok({ message: `Cookie "${name}" added`, before, after });
  },
});
