import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { resolveEnvironmentVariables } from "@/agent/utils/environment";
import { truncate, withSuffix } from "@/utils";

const inputSchema = z.object({
  name: z.string().describe("The cookie name"),
  value: z.string().describe("The cookie value. Supports environment variable substitution"),
});

const outputSchema = ToolResult.schema();

type RequestCookieSetInput = z.infer<typeof inputSchema>;
type RequestCookieSetOutput = ToolResultType;

export const display = {
  streaming: ({ input }) =>
    input
      ? [{ text: "Setting " }, { text: truncate(input.name), muted: true }]
      : [{ text: "Setting " }, { text: "cookie", muted: true }],
  success: ({ input }) => {
    if (!input) {
      return [{ text: "Set " }, { text: "cookie", muted: true }];
    }
    if (input.value === "") {
      return [{ text: "Cleared cookie " }, { text: truncate(input.name), muted: true }];
    }
    return [
      { text: "Set cookie " },
      { text: truncate(input.name), muted: true },
      { text: " to " },
      { text: truncate(input.value), muted: true },
    ];
  },
  error: ({ input }) => `Failed to set cookie${withSuffix(input?.name)}`,
} satisfies ToolDisplay<RequestCookieSetInput>;

export const RequestCookieSet = tool({
  description:
    "Set or replace a cookie value in the Cookie header of the current HTTP request. If the cookie already exists, its value is replaced; if it doesn't exist, it's added. Use this for modifying session tokens, swapping user contexts, or injecting test values into existing cookies. The value supports environment variable substitution using {{VAR_NAME}} syntax. Pass an empty string as the value to set a cookie with no value. For adding duplicate cookies (unusual but sometimes needed for testing), use RequestCookieAdd instead. This tool will fail if no HTTP request is currently loaded.",
  inputSchema,
  outputSchema,
  execute: async ({ name, value }, { experimental_context }): Promise<RequestCookieSetOutput> => {
    const context = experimental_context as AgentContext;
    if (context.httpRequest === "") {
      return ToolResult.err("No HTTP request loaded");
    }
    const resolvedValue = await resolveEnvironmentVariables(context.sdk, value);
    const forge = HttpForge.create(context.httpRequest).setCookie(name, resolvedValue);
    const after = forge.build();
    context.setHttpRequest(after);
    const cookieHeader = forge.getHeader("Cookie");
    return ToolResult.ok({ message: `Cookie "${name}" set\nCookie: ${cookieHeader ?? "(empty)"}` });
  },
});
