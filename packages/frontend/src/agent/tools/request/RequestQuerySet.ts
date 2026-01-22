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

const valueSchema = z.object({
  before: z.string(),
  after: z.string(),
});

const outputSchema = ToolResult.schema(valueSchema);

type RequestQuerySetInput = z.infer<typeof inputSchema>;
type RequestQuerySetValue = z.infer<typeof valueSchema>;
type RequestQuerySetOutput = ToolResultType<RequestQuerySetValue>;

export const display = {
  streaming: ({ input }) =>
    input
      ? [{ text: "Setting " }, { text: truncate(input.key), muted: true }]
      : [{ text: "Setting " }, { text: "query param", muted: true }],
  success: ({ input }) =>
    input
      ? [
          { text: "Set query param " },
          { text: truncate(input.key, 40), muted: true },
          { text: " to " },
          { text: truncate(input.value, 40), muted: true },
        ]
      : [{ text: "Set query param" }, { text: "query param", muted: true }],
  error: ({ input }) => `Failed to set query param${withSuffix(input?.key)}`,
} satisfies ToolDisplay<RequestQuerySetInput, RequestQuerySetValue>;

export const RequestQuerySet = tool({
  description: "Add or update a query parameter in the current HTTP request",
  inputSchema,
  outputSchema,
  execute: async ({ key, value }, { experimental_context }): Promise<RequestQuerySetOutput> => {
    const context = experimental_context as AgentContext;
    const before = context.httpRequest;
    if (before === "") {
      return ToolResult.err("No HTTP request loaded");
    }
    const resolvedValue = await resolveEnvironmentVariables(context.sdk, value);
    const after = HttpForge.create(before).upsertQueryParam(key, resolvedValue).build();
    context.setHttpRequest(after);
    return ToolResult.ok({ message: `Query param "${key}" set`, before, after });
  },
});
