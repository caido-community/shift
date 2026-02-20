import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { resolveToolInputPlaceholders } from "@/agent/tools/utils/placeholders";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { truncate, withSuffix } from "@/utils";

const inputSchema = z.object({
  name: z.string().describe("The cookie name"),
  value: z
    .string()
    .describe(
      "The cookie value. Supports placeholders like §§§Env§EnvironmentName§Variable_Name§§§ and §§§Blob§blobId§§§"
    ),
});

const outputSchema = ToolResult.schema();

type RequestCookieAddInput = z.infer<typeof inputSchema>;
type RequestCookieAddOutput = ToolResultType;

export const display = {
  streaming: ({ input }) =>
    input
      ? [{ text: "Adding " }, { text: truncate(input.name), muted: true }]
      : [{ text: "Adding " }, { text: "cookie", muted: true }],
  success: ({ input }) =>
    input
      ? [
          { text: "Added cookie " },
          { text: truncate(input.name), muted: true },
          { text: " with value " },
          { text: truncate(input.value), muted: true },
        ]
      : [{ text: "Added cookie" }, { text: "cookie", muted: true }],
  error: ({ input }) => `Failed to add cookie${withSuffix(input?.name)}`,
} satisfies ToolDisplay<RequestCookieAddInput>;

export const RequestCookieAdd = tool({
  description:
    "Add a new cookie to the Cookie header of the current HTTP request. Use this to add session tokens, authentication cookies, tracking cookies, or test values. If a cookie with the same name already exists, this adds a duplicate (which may cause undefined behavior on the server). For replacing an existing cookie's value, use RequestCookieSet instead. The value supports placeholders like §§§Env§EnvironmentName§Variable_Name§§§ and §§§Blob§blobId§§§. Cookies are added to the existing Cookie header or a new one is created if none exists. This tool will fail if no HTTP request is currently loaded.",
  inputSchema,
  outputSchema,
  execute: async ({ name, value }, { experimental_context }): Promise<RequestCookieAddOutput> => {
    const context = experimental_context as AgentContext;
    if (context.httpRequest === "") {
      return ToolResult.err("No HTTP request loaded");
    }
    const resolvedValueResult = await resolveToolInputPlaceholders(context, value);
    if (resolvedValueResult.kind === "Error") {
      return ToolResult.err("Failed to resolve placeholders", resolvedValueResult.error);
    }
    const resolvedValue = resolvedValueResult.value;
    const forge = HttpForge.create(context.httpRequest).addCookie(name, resolvedValue);
    const after = forge.build();
    context.setHttpRequest(after);
    const cookieHeader = forge.getHeader("Cookie");
    return ToolResult.ok({
      message: `Cookie "${name}" added\nCookie: ${cookieHeader ?? "(empty)"}`,
    });
  },
});
