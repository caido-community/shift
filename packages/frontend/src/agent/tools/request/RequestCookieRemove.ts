import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { truncate, withSuffix } from "@/utils";

const inputSchema = z.object({
  name: z.string().describe("The cookie name to remove"),
});

const outputSchema = ToolResult.schema();

type RequestCookieRemoveInput = z.infer<typeof inputSchema>;
type RequestCookieRemoveOutput = ToolResultType;

export const display = {
  streaming: ({ input }) =>
    input
      ? [{ text: "Removing cookie " }, { text: truncate(input.name), muted: true }]
      : [{ text: "Removing " }, { text: "cookie", muted: true }],
  success: ({ input }) => [
    { text: "Removed cookie " },
    { text: truncate(input?.name ?? "unknown"), muted: true },
  ],
  error: ({ input }) => `Failed to remove cookie${withSuffix(input?.name)}`,
} satisfies ToolDisplay<RequestCookieRemoveInput>;

export const RequestCookieRemove = tool({
  description:
    "Remove a cookie from the Cookie header of the current HTTP request by its name. Use this to test how the application behaves without certain cookies - for example, removing session cookies to test unauthenticated behavior, or removing CSRF tokens to test protection mechanisms. If the cookie doesn't exist, the operation succeeds silently. Removes all occurrences if the cookie appears multiple times. This tool will fail if no HTTP request is currently loaded.",
  inputSchema,
  outputSchema,
  execute: ({ name }, { experimental_context }): RequestCookieRemoveOutput => {
    const context = experimental_context as AgentContext;
    if (context.httpRequest === "") {
      return ToolResult.err("No HTTP request loaded");
    }
    const forge = HttpForge.create(context.httpRequest).removeCookie(name);
    const after = forge.build();
    context.setHttpRequest(after);
    const cookieHeader = forge.getHeader("Cookie");
    return ToolResult.ok({
      message: `Cookie "${name}" removed\nCookie: ${cookieHeader ?? "(none)"}`,
    });
  },
});
