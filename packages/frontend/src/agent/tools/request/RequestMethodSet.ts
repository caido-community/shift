import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";

const inputSchema = z.object({
  method: z.string().describe("The HTTP method (GET, POST, PUT, DELETE, etc.)"),
});

const valueSchema = z.object({
  before: z.string(),
  after: z.string(),
});

const outputSchema = ToolResult.schema(valueSchema);

type RequestMethodSetInput = z.infer<typeof inputSchema>;
type RequestMethodSetValue = z.infer<typeof valueSchema>;
type RequestMethodSetOutput = ToolResultType<RequestMethodSetValue>;

export const display = {
  streaming: () => [{ text: "Setting " }, { text: "request method", muted: true }],
  success: ({ input }) => [
    { text: "Set method to " },
    { text: input?.method ?? "unknown", muted: true },
  ],
  error: () => "Failed to set request method",
} satisfies ToolDisplay<RequestMethodSetInput, RequestMethodSetValue>;

export const RequestMethodSet = tool({
  description: "Set the HTTP method of the current request",
  inputSchema,
  outputSchema,
  execute: ({ method }, { experimental_context }): RequestMethodSetOutput => {
    const context = experimental_context as AgentContext;
    const before = context.httpRequest;
    if (before === "") {
      return ToolResult.err("No HTTP request loaded");
    }
    const after = HttpForge.create(before).method(method).build();
    context.setHttpRequest(after);
    return ToolResult.ok({ message: `Method set to "${method}"`, before, after });
  },
});
