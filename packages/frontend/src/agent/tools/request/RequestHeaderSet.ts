import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { resolveEnvironmentVariables } from "@/agent/utils/environment";
import { truncate, withSuffix } from "@/utils";

const inputSchema = z.object({
  name: z.string().describe("The header name"),
  value: z.string().describe("The header value. Supports environment variable substitution"),
});

const valueSchema = z.object({
  before: z.string(),
  after: z.string(),
});

const outputSchema = ToolResult.schema(valueSchema);

type RequestHeaderSetInput = z.infer<typeof inputSchema>;
type RequestHeaderSetValue = z.infer<typeof valueSchema>;
type RequestHeaderSetOutput = ToolResultType<RequestHeaderSetValue>;

export const display = {
  streaming: ({ input }) =>
    input
      ? [{ text: "Setting " }, { text: truncate(input.name), muted: true }]
      : [{ text: "Setting " }, { text: "header", muted: true }],
  success: ({ input }) =>
    input
      ? [
          { text: "Set header " },
          { text: truncate(input.name), muted: true },
          { text: " to " },
          { text: truncate(input.value), muted: true },
        ]
      : [{ text: "Set header" }, { text: "header", muted: true }],
  error: ({ input }) => `Failed to set header${withSuffix(input?.name)}`,
} satisfies ToolDisplay<RequestHeaderSetInput, RequestHeaderSetValue>;

export const RequestHeaderSet = tool({
  description: "Set or replace a header in the current HTTP request",
  inputSchema,
  outputSchema,
  execute: async ({ name, value }, { experimental_context }): Promise<RequestHeaderSetOutput> => {
    const context = experimental_context as AgentContext;
    const before = context.httpRequest;
    if (before === "") {
      return ToolResult.err("No HTTP request loaded");
    }
    const resolvedValue = await resolveEnvironmentVariables(context.sdk, value);
    const after = HttpForge.create(before).setHeader(name, resolvedValue).build();
    context.setHttpRequest(after);
    return ToolResult.ok({ message: `Header "${name}" set`, before, after });
  },
});
