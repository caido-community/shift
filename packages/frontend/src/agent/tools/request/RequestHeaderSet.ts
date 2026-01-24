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

const outputSchema = ToolResult.schema();

type RequestHeaderSetInput = z.infer<typeof inputSchema>;
type RequestHeaderSetOutput = ToolResultType;

export const display = {
  streaming: ({ input }) =>
    input
      ? [{ text: "Setting " }, { text: truncate(input.name), muted: true }]
      : [{ text: "Setting " }, { text: "header", muted: true }],
  success: ({ input }) => {
    if (!input) {
      return [{ text: "Set " }, { text: "header", muted: true }];
    }
    if (input.value === "") {
      return [{ text: "Cleared header " }, { text: truncate(input.name), muted: true }];
    }
    return [
      { text: "Set header " },
      { text: truncate(input.name), muted: true },
      { text: " to " },
      { text: truncate(input.value), muted: true },
    ];
  },
  error: ({ input }) => `Failed to set header${withSuffix(input?.name)}`,
} satisfies ToolDisplay<RequestHeaderSetInput>;

export const RequestHeaderSet = tool({
  description:
    "Set or replace an HTTP header in the current request. If the header already exists, its value will be replaced; if it doesn't exist, it will be added. Use this for modifying authentication tokens, content types, custom headers, or any header that should have exactly one value. For headers that can have multiple values (like Accept), use RequestHeaderAdd instead. The value parameter supports environment variable substitution using {{VAR_NAME}} syntax. Pass an empty string as the value to clear the header's value while keeping the header present. This tool will fail if no HTTP request is currently loaded. Returns the complete request before and after the modification.",
  inputSchema,
  outputSchema,
  execute: async ({ name, value }, { experimental_context }): Promise<RequestHeaderSetOutput> => {
    const context = experimental_context as AgentContext;
    if (context.httpRequest === "") {
      return ToolResult.err("No HTTP request loaded");
    }
    const resolvedValue = await resolveEnvironmentVariables(context.sdk, value);
    const after = HttpForge.create(context.httpRequest).setHeader(name, resolvedValue).build();
    context.setHttpRequest(after);
    return ToolResult.ok({ message: `Header "${name}" set` });
  },
});
