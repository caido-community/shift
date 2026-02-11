import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";

const inputSchema = z.object({
  method: z.string().describe("The HTTP method (GET, POST, PUT, DELETE, etc.)"),
});

const outputSchema = ToolResult.schema();

type RequestMethodSetInput = z.infer<typeof inputSchema>;
type RequestMethodSetOutput = ToolResultType;

export const display = {
  streaming: () => [{ text: "Setting " }, { text: "request method", muted: true }],
  success: ({ input }) => [
    { text: "Set method to " },
    { text: input?.method ?? "unknown", muted: true },
  ],
  error: () => "Failed to set request method",
} satisfies ToolDisplay<RequestMethodSetInput>;

export const RequestMethodSet = tool({
  description:
    "Change the HTTP method of the current request. Use this to test how endpoints respond to different methods - for example, changing GET to POST to test for method-based access control issues, or trying DELETE/PUT/PATCH on REST endpoints. The method parameter accepts any valid HTTP method string (GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD, etc.). This only changes the method in the request line; you may also need to add appropriate headers (Content-Type) or body content for methods that typically include a request body. This tool will fail if no HTTP request is currently loaded.",
  inputSchema,
  outputSchema,
  execute: ({ method }, { experimental_context }): RequestMethodSetOutput => {
    const context = experimental_context as AgentContext;
    if (context.httpRequest === "") {
      return ToolResult.err("No HTTP request loaded");
    }
    const forge = HttpForge.create(context.httpRequest).method(method);
    const after = forge.build();
    context.setHttpRequest(after);
    const path = forge.getPath() ?? "/";
    const query = forge.getQuery();
    const fullPath = query !== null ? `${path}?${query}` : path;
    return ToolResult.ok({ message: `Method set to "${method}"\n${method} ${fullPath}` });
  },
});
