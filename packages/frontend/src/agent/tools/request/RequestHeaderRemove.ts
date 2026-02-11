import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { truncate, withSuffix } from "@/utils";

const inputSchema = z.object({
  name: z.string().describe("The header name to remove"),
});

const outputSchema = ToolResult.schema();

type RequestHeaderRemoveInput = z.infer<typeof inputSchema>;
type RequestHeaderRemoveOutput = ToolResultType;

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
} satisfies ToolDisplay<RequestHeaderRemoveInput>;

export const RequestHeaderRemove = tool({
  description:
    "Remove an HTTP header from the current request by its name. Use this to test how the application behaves without certain headers - for example, removing Authorization to test unauthenticated access, removing Content-Type to test parsing behavior, or removing custom headers to bypass security controls. The header name matching is case-insensitive. If the header doesn't exist, the operation succeeds silently. Removes all occurrences if the header appears multiple times. This tool will fail if no HTTP request is currently loaded.",
  inputSchema,
  outputSchema,
  execute: ({ name }, { experimental_context }): RequestHeaderRemoveOutput => {
    const context = experimental_context as AgentContext;
    if (context.httpRequest === "") {
      return ToolResult.err("No HTTP request loaded");
    }
    const forge = HttpForge.create(context.httpRequest).removeHeader(name);
    const after = forge.build();
    context.setHttpRequest(after);
    const remaining = forge.getHeader(name);
    const verification =
      remaining === null ? `${name} header is no longer present` : `${name}: ${remaining}`;
    return ToolResult.ok({ message: `Header "${name}" removed\n${verification}` });
  },
});
