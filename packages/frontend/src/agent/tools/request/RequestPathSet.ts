import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { resolveEnvironmentVariables } from "@/agent/utils/environment";
import { truncate } from "@/utils";

const inputSchema = z.object({
  path: z.string().describe("The new request path. Supports environment variable substitution"),
});

const valueSchema = z.object({
  before: z.string(),
  after: z.string(),
});

const outputSchema = ToolResult.schema(valueSchema);

type RequestPathSetInput = z.infer<typeof inputSchema>;
type RequestPathSetValue = z.infer<typeof valueSchema>;
type RequestPathSetOutput = ToolResultType<RequestPathSetValue>;

export const display = {
  streaming: ({ input }) =>
    input
      ? [{ text: "Setting path to " }, { text: truncate(input.path, 32), muted: true }]
      : [{ text: "Setting " }, { text: "request path", muted: true }],
  success: ({ input }) => [
    { text: "Set path to " },
    { text: truncate(input?.path ?? "unknown", 32), muted: true },
  ],
  error: () => "Failed to set request path",
} satisfies ToolDisplay<RequestPathSetInput, RequestPathSetValue>;

export const RequestPathSet = tool({
  description: "Set the path of the current HTTP request",
  inputSchema,
  outputSchema,
  execute: async ({ path }, { experimental_context }): Promise<RequestPathSetOutput> => {
    const context = experimental_context as AgentContext;
    const before = context.httpRequest;
    if (before === "") {
      return ToolResult.err("No HTTP request loaded");
    }
    const resolvedPath = await resolveEnvironmentVariables(context.sdk, path);
    const after = HttpForge.create(before).path(resolvedPath).build();
    context.setHttpRequest(after);
    return ToolResult.ok({ message: `Path set to "${resolvedPath}"`, before, after });
  },
});
