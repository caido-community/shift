import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { resolveEnvironmentVariables } from "@/agent/utils/environment";
import { truncate, withSuffix } from "@/utils";

const inputSchema = z.object({
  key: z.string().describe("The query parameter key"),
  value: z
    .string()
    .describe("The query parameter value. Supports environment variable substitution"),
});

const outputSchema = ToolResult.schema();

type RequestQuerySetInput = z.infer<typeof inputSchema>;
type RequestQuerySetOutput = ToolResultType;

export const display = {
  streaming: ({ input }) =>
    input
      ? [{ text: "Setting " }, { text: truncate(input.key), muted: true }]
      : [{ text: "Setting " }, { text: "query param", muted: true }],
  success: ({ input }) => {
    if (!input) {
      return [{ text: "Set " }, { text: "query param", muted: true }];
    }
    if (input.value === "") {
      return [{ text: "Cleared query param " }, { text: truncate(input.key, 40), muted: true }];
    }
    return [
      { text: "Set query param " },
      { text: truncate(input.key, 40), muted: true },
      { text: " to " },
      { text: truncate(input.value, 90), muted: true },
    ];
  },
  error: ({ input }) => `Failed to set query param${withSuffix(input?.key)}`,
} satisfies ToolDisplay<RequestQuerySetInput>;

export const RequestQuerySet = tool({
  description:
    "Add or update a URL query parameter in the current HTTP request. If the parameter already exists, its value is replaced; if it doesn't exist, it's added. Use this to modify search terms, filter values, pagination parameters, or inject test payloads into query strings. The key is the parameter name and value is its content. The value supports environment variable substitution using {{VAR_NAME}} syntax. Pass an empty string as the value to set a parameter with no value (e.g., ?debug). For parameters that can appear multiple times, each call replaces the existing value. This tool will fail if no HTTP request is currently loaded.",
  inputSchema,
  outputSchema,
  execute: async ({ key, value }, { experimental_context }): Promise<RequestQuerySetOutput> => {
    const context = experimental_context as AgentContext;
    if (context.httpRequest === "") {
      return ToolResult.err("No HTTP request loaded");
    }
    const resolvedValue = await resolveEnvironmentVariables(context.sdk, value);
    const after = HttpForge.create(context.httpRequest)
      .upsertQueryParam(key, resolvedValue)
      .build();
    context.setHttpRequest(after);
    return ToolResult.ok({ message: `Query param "${key}" set` });
  },
});
