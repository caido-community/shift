import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { truncate, withSuffix } from "@/utils";

const inputSchema = z.object({
  name: z.string().describe("The header name to remove"),
});

const valueSchema = z.object({
  before: z.string(),
  after: z.string(),
});

const outputSchema = ToolResult.schema(valueSchema);

type RequestHeaderRemoveInput = z.infer<typeof inputSchema>;
type RequestHeaderRemoveValue = z.infer<typeof valueSchema>;
type RequestHeaderRemoveOutput = ToolResultType<RequestHeaderRemoveValue>;

export const display = {
  streaming: ({ input }) =>
    input
      ? [{ text: "Removing header " }, { text: truncate(input.name), muted: true }]
      : [{ text: "Removing " }, { text: "header", muted: true }],
  success: ({ input }) => [
    { text: "Removed header " },
    { text: truncate(input?.name ?? "unknown"), muted: true },
  ],
  error: ({ input }) => `Failed to remove header${withSuffix(input?.name)}`,
} satisfies ToolDisplay<RequestHeaderRemoveInput, RequestHeaderRemoveValue>;

export const RequestHeaderRemove = tool({
  description: "Remove a header from the current HTTP request",
  inputSchema,
  outputSchema,
  execute: ({ name }, { experimental_context }): RequestHeaderRemoveOutput => {
    const context = experimental_context as AgentContext;
    const before = context.httpRequest;
    if (before === "") {
      return ToolResult.err("No HTTP request loaded");
    }
    const after = HttpForge.create(before).removeHeader(name).build();
    context.setHttpRequest(after);
    return ToolResult.ok({ message: `Header "${name}" removed`, before, after });
  },
});
