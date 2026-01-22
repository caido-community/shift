import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { resolveEnvironmentVariables } from "@/agent/utils/environment";
import { truncate } from "@/utils";

const inputSchema = z.object({
  body: z
    .string()
    .describe("The new body content for the request. Supports environment variable substitution"),
});

const valueSchema = z.object({
  before: z.string(),
  after: z.string(),
});

const outputSchema = ToolResult.schema(valueSchema);

type RequestBodySetInput = z.infer<typeof inputSchema>;
type RequestBodySetValue = z.infer<typeof valueSchema>;
type RequestBodySetOutput = ToolResultType<RequestBodySetValue>;

export const display = {
  streaming: ({ input }) =>
    input
      ? [{ text: "Setting body to " }, { text: truncate(input.body, 50), muted: true }]
      : [{ text: "Setting " }, { text: "request body", muted: true }],
  success: ({ input }) =>
    input
      ? [{ text: "Set body to " }, { text: truncate(input.body, 50), muted: true }]
      : [{ text: "Updated " }, { text: "request body", muted: true }],
  error: () => "Failed to set request body",
} satisfies ToolDisplay<RequestBodySetInput, RequestBodySetValue>;

export const RequestBodySet = tool({
  description: "Set the body of the current HTTP request",
  inputSchema,
  outputSchema,
  execute: async ({ body }, { experimental_context }): Promise<RequestBodySetOutput> => {
    const context = experimental_context as AgentContext;
    const before = context.httpRequest;
    if (before === "") {
      return ToolResult.err("No HTTP request loaded");
    }
    const resolvedBody = await resolveEnvironmentVariables(context.sdk, body);
    const after = HttpForge.create(before).body(resolvedBody).build();
    context.setHttpRequest(after);
    return ToolResult.ok({ message: "Request body updated", before, after });
  },
});
