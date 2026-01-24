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

const outputSchema = ToolResult.schema();

type RequestBodySetInput = z.infer<typeof inputSchema>;
type RequestBodySetOutput = ToolResultType;

export const display = {
  streaming: ({ input }) => {
    if (!input) {
      return [{ text: "Setting " }, { text: "request body", muted: true }];
    }
    if (input.body === "") {
      return [{ text: "Removing " }, { text: "request body", muted: true }];
    }
    return [{ text: "Setting body to " }, { text: truncate(input.body, 100), muted: true }];
  },
  success: ({ input }) => {
    if (!input) {
      return [{ text: "Updated " }, { text: "request body", muted: true }];
    }
    if (input.body === "") {
      return [{ text: "Removed " }, { text: "request body", muted: true }];
    }
    return [{ text: "Set body to " }, { text: truncate(input.body, 100), muted: true }];
  },
  error: () => "Failed to set request body",
} satisfies ToolDisplay<RequestBodySetInput>;

export const RequestBodySet = tool({
  description:
    "Set or replace the body content of the current HTTP request. Use this when you need to modify POST/PUT/PATCH request payloads, add JSON data, form data, or any other request body content. The body parameter accepts any string content and supports environment variable substitution using {{VAR_NAME}} syntax. Pass an empty string to remove the body entirely. This tool will fail if no HTTP request is currently loaded in the replay session. Returns the complete request before and after the modification.",
  inputSchema,
  outputSchema,
  execute: async ({ body }, { experimental_context }): Promise<RequestBodySetOutput> => {
    const context = experimental_context as AgentContext;
    if (context.httpRequest === "") {
      return ToolResult.err("No HTTP request loaded");
    }
    const resolvedBody = await resolveEnvironmentVariables(context.sdk, body);
    const after = HttpForge.create(context.httpRequest).body(resolvedBody).build();
    context.setHttpRequest(after);
    return ToolResult.ok({ message: "Request body updated" });
  },
});
