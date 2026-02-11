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

type RequestQueryAddInput = z.infer<typeof inputSchema>;
type RequestQueryAddOutput = ToolResultType;

export const display = {
  streaming: ({ input }) =>
    input
      ? [{ text: "Adding " }, { text: truncate(input.key), muted: true }]
      : [{ text: "Adding " }, { text: "query param", muted: true }],
  success: ({ input }) =>
    input
      ? [
          { text: "Added query param " },
          { text: truncate(input.key, 40), muted: true },
          { text: " = " },
          { text: truncate(input.value, 90), muted: true },
        ]
      : [{ text: "Added " }, { text: "query param", muted: true }],
  error: ({ input }) => `Failed to add query param${withSuffix(input?.key)}`,
} satisfies ToolDisplay<RequestQueryAddInput>;

export const RequestQueryAdd = tool({
  description:
    "Append a new query parameter to the current HTTP request. Unlike RequestQuerySet which replaces existing values, this adds a duplicate - the same key can appear multiple times (e.g. ?redirect_uri=1&redirect_uri=2). Use for testing parameter pollution, OAuth redirect_uri manipulation, or APIs that accept repeated params. The value supports environment variable substitution using {{VAR_NAME}} syntax. Pass empty string for a param with no value (e.g. ?debug). This tool will fail if no HTTP request is currently loaded.",
  inputSchema,
  outputSchema,
  execute: async ({ key, value }, { experimental_context }): Promise<RequestQueryAddOutput> => {
    const context = experimental_context as AgentContext;
    if (context.httpRequest === "") {
      return ToolResult.err("No HTTP request loaded");
    }
    const resolvedValue = await resolveEnvironmentVariables(context.sdk, value);
    const after = HttpForge.create(context.httpRequest).addQueryParam(key, resolvedValue).build();
    context.setHttpRequest(after);
    return ToolResult.ok({ message: `Query param "${key}" added` });
  },
});
