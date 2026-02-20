import { tool } from "ai";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { resolveToolInputPlaceholders } from "@/agent/tools/utils/placeholders";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { normalizeRawHttpRequest } from "@/agent/utils/http";

const inputSchema = z.object({
  raw: z
    .string()
    .describe(
      "The complete raw HTTP request. Supports placeholders like §§§Env§EnvironmentName§Variable_Name§§§ and §§§Blob§blobId§§§"
    ),
});

const outputSchema = ToolResult.schema();

type RequestRawSetInput = z.infer<typeof inputSchema>;
type RequestRawSetOutput = ToolResultType;

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
} satisfies ToolDisplay<RequestRawSetInput>;

const MAX_LENGTH = 2000;
export const RequestRawSet = tool({
  description:
    "Replace the entire raw HTTP request with new content. Use this when you need to completely rewrite the request or paste in a request from another source. The raw parameter should contain the complete HTTP request including the request line (e.g., 'GET /path HTTP/1.1'), headers, and body. Line endings are normalized to CRLF as required by HTTP. Supports placeholders like §§§Env§EnvironmentName§Variable_Name§§§ and §§§Blob§blobId§§§. For partial modifications, prefer the specific tools (RequestHeaderSet, RequestBodySet, RequestPathSet, etc.) as they preserve the rest of the request structure.",
  inputSchema,
  outputSchema,
  execute: async ({ raw }, { experimental_context }): Promise<RequestRawSetOutput> => {
    const context = experimental_context as AgentContext;
    const resolvedResult = await resolveToolInputPlaceholders(context, raw);
    if (resolvedResult.kind === "Error") {
      return ToolResult.err("Failed to resolve placeholders", resolvedResult.error);
    }
    const resolved = resolvedResult.value;
    const normalized = normalizeRawHttpRequest(resolved);
    context.setHttpRequest(normalized);

    const truncated = normalized.length > MAX_LENGTH;
    const preview = truncated ? normalized.slice(0, MAX_LENGTH) : normalized;
    const truncationNote = truncated ? "\n\n[... truncated]" : "";
    return ToolResult.ok({ message: `Raw request replaced\n\n${preview}${truncationNote}` });
  },
});
