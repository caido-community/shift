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

type RequestCookieSetInput = z.infer<typeof inputSchema>;
type RequestCookieSetValue = z.infer<typeof valueSchema>;
type RequestCookieSetOutput = ToolResultType<RequestCookieSetValue>;

export const display = {
  streaming: ({ input }) =>
    input
      ? [{ text: "Setting " }, { text: truncate(input.name), muted: true }]
      : [{ text: "Setting " }, { text: "cookie", muted: true }],
  success: ({ input }) => {
    if (!input) {
      return [{ text: "Set " }, { text: "cookie", muted: true }];
    }
    if (input.value === "") {
      return [{ text: "Cleared cookie " }, { text: truncate(input.name), muted: true }];
    }
    return [
      { text: "Set cookie " },
      { text: truncate(input.name), muted: true },
      { text: " to " },
      { text: truncate(input.value), muted: true },
    ];
  },
  error: ({ input }) => `Failed to set cookie${withSuffix(input?.name)}`,
} satisfies ToolDisplay<RequestCookieSetInput, RequestCookieSetValue>;

export const RequestCookieSet = tool({
  description: "Set or replace a cookie in the current HTTP request.",
  inputSchema,
  outputSchema,
  execute: async ({ name, value }, { experimental_context }): Promise<RequestCookieSetOutput> => {
    const context = experimental_context as AgentContext;
    const before = context.httpRequest;
    if (before === "") {
      return ToolResult.err("No HTTP request loaded");
    }
    const resolvedValue = await resolveEnvironmentVariables(context.sdk, value);
    const after = HttpForge.create(before).setCookie(name, resolvedValue).build();
    context.setHttpRequest(after);
    return ToolResult.ok({ message: `Cookie "${name}" set`, before, after });
  },
});
