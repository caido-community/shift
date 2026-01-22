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

type RequestHeaderAddInput = z.infer<typeof inputSchema>;
type RequestHeaderAddValue = z.infer<typeof valueSchema>;
type RequestHeaderAddOutput = ToolResultType<RequestHeaderAddValue>;

export const display = {
  streaming: ({ input }) =>
    input
      ? [{ text: "Adding " }, { text: truncate(input.name), muted: true }]
      : [{ text: "Adding " }, { text: "header", muted: true }],
  success: ({ input }) =>
    input
      ? [
          { text: "Added header " },
          { text: truncate(input.name), muted: true },
          { text: " with value " },
          { text: truncate(input.value), muted: true },
        ]
      : [{ text: "Added header" }, { text: "header", muted: true }],
  error: ({ input }) => `Failed to add header${withSuffix(input?.name)}`,
} satisfies ToolDisplay<RequestHeaderAddInput, RequestHeaderAddValue>;

export const RequestHeaderAdd = tool({
  description: "Add a new header to the current HTTP request.",
  inputSchema,
  outputSchema,
  execute: async ({ name, value }, { experimental_context }): Promise<RequestHeaderAddOutput> => {
    const context = experimental_context as AgentContext;
    const before = context.httpRequest;
    if (before === "") {
      return ToolResult.err("No HTTP request loaded");
    }
    const resolvedValue = await resolveEnvironmentVariables(context.sdk, value);
    const after = HttpForge.create(before).addHeader(name, resolvedValue).build();
    context.setHttpRequest(after);
    return ToolResult.ok({ message: `Header "${name}" added`, before, after });
  },
});
