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

const outputSchema = ToolResult.schema();

type RequestPathSetInput = z.infer<typeof inputSchema>;
type RequestPathSetOutput = ToolResultType;

export const display = {
  streaming: ({ input }) =>
    input
      ? [{ text: "Setting path to " }, { text: truncate(input.path, 48), muted: true }]
      : [{ text: "Setting " }, { text: "request path", muted: true }],
  success: ({ input }) => {
    if (!input) {
      return [{ text: "Set " }, { text: "request path", muted: true }];
    }
    if (input.path === "") {
      return [{ text: "Cleared " }, { text: "request path", muted: true }];
    }
    return [{ text: "Set path to " }, { text: truncate(input.path, 48), muted: true }];
  },
  error: () => "Failed to set request path",
} satisfies ToolDisplay<RequestPathSetInput>;

export const RequestPathSet = tool({
  description:
    "Set the URL path of the current HTTP request. Use this to change which endpoint the request targets - for example, testing path traversal (../../../etc/passwd), accessing different API versions (/api/v2/users), or exploring directory structures. The path should start with a forward slash and not include the query string (use RequestQuerySet for query parameters). Supports environment variable substitution using {{VAR_NAME}} syntax. Pass an empty string to set the path to root (/). This tool will fail if no HTTP request is currently loaded.",
  inputSchema,
  outputSchema,
  execute: async ({ path }, { experimental_context }): Promise<RequestPathSetOutput> => {
    const context = experimental_context as AgentContext;
    if (context.httpRequest === "") {
      return ToolResult.err("No HTTP request loaded");
    }
    const resolvedPath = await resolveEnvironmentVariables(context.sdk, path);
    const after = HttpForge.create(context.httpRequest).path(resolvedPath).build();
    context.setHttpRequest(after);
    return ToolResult.ok({ message: `Path set to "${resolvedPath}"` });
  },
});
