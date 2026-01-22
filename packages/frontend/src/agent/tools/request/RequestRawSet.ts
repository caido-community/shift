import { tool } from "ai";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { resolveEnvironmentVariables } from "@/agent/utils/environment";
import { normalizeCRLF } from "@/agent/utils/http";

const inputSchema = z.object({
  raw: z
    .string()
    .describe("The complete raw HTTP request. Supports environment variable substitution"),
});

const valueSchema = z.object({
  before: z.string(),
  after: z.string(),
});

const outputSchema = ToolResult.schema(valueSchema);

type RequestRawSetInput = z.infer<typeof inputSchema>;
type RequestRawSetValue = z.infer<typeof valueSchema>;
type RequestRawSetOutput = ToolResultType<RequestRawSetValue>;

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} bytes`;
  return `${(bytes / 1024).toFixed(1)} KB`;
};

export const display = {
  streaming: ({ input }) =>
    input
      ? [{ text: "Replacing request with " }, { text: formatBytes(input.raw.length), muted: true }]
      : [{ text: "Replacing " }, { text: "request", muted: true }],
  success: ({ input }) =>
    input
      ? [{ text: "Replaced request with " }, { text: formatBytes(input.raw.length), muted: true }]
      : [{ text: "Replaced " }, { text: "request", muted: true }],
  error: () => "Failed to replace request",
} satisfies ToolDisplay<RequestRawSetInput, RequestRawSetValue>;

export const RequestRawSet = tool({
  description: "Replace the entire raw HTTP request",
  inputSchema,
  outputSchema,
  execute: async ({ raw }, { experimental_context }): Promise<RequestRawSetOutput> => {
    const context = experimental_context as AgentContext;
    const before = context.httpRequest;
    const resolved = await resolveEnvironmentVariables(context.sdk, raw);
    const normalized = normalizeCRLF(resolved);
    context.setHttpRequest(normalized);
    return ToolResult.ok({ message: "Raw request replaced", before, after: normalized });
  },
});
