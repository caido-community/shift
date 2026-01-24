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

type RequestHeaderAddInput = z.infer<typeof inputSchema>;
type RequestHeaderAddOutput = ToolResultType;

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
} satisfies ToolDisplay<RequestHeaderAddInput>;

export const RequestHeaderAdd = tool({
  description:
    "Add a new HTTP header to the current request without removing existing headers with the same name. Use this for headers that can legitimately appear multiple times (like Accept, Accept-Language, Cookie) or when you specifically want to add a duplicate header for testing purposes. For headers that should have only one value (Authorization, Content-Type, Host), use RequestHeaderSet instead to avoid duplicates. The value supports environment variable substitution using {{VAR_NAME}} syntax. This tool will fail if no HTTP request is currently loaded.",
  inputSchema,
  outputSchema,
  execute: async ({ name, value }, { experimental_context }): Promise<RequestHeaderAddOutput> => {
    const context = experimental_context as AgentContext;
    if (context.httpRequest === "") {
      return ToolResult.err("No HTTP request loaded");
    }
    const resolvedValue = await resolveEnvironmentVariables(context.sdk, value);
    const after = HttpForge.create(context.httpRequest).addHeader(name, resolvedValue).build();
    context.setHttpRequest(after);
    return ToolResult.ok({ message: `Header "${name}" added` });
  },
});
