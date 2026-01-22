import { tool } from "ai";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { resolveEnvironmentVariables } from "@/agent/utils/environment";
import { normalizeCRLF } from "@/agent/utils/http";
import { replaceUniqueText } from "@/agent/utils/text";
import { truncate } from "@/utils";

const inputSchema = z.object({
  oldText: z.string().describe("Exact text to find and replace (must match exactly)"),
  newText: z
    .string()
    .describe("New text to replace the old text with. Supports environment variable substitution"),
});

const valueSchema = z.object({
  before: z.string(),
  after: z.string(),
});

const outputSchema = ToolResult.schema(valueSchema);

type RequestRawEditInput = z.infer<typeof inputSchema>;
type RequestRawEditValue = z.infer<typeof valueSchema>;
type RequestRawEditOutput = ToolResultType<RequestRawEditValue>;

export const display = {
  streaming: ({ input }) =>
    input
      ? [
          { text: "Replacing " },
          { text: truncate(input.oldText, 18), muted: true },
          { text: " → " },
          { text: truncate(input.newText, 18), muted: true },
        ]
      : [{ text: "Editing " }, { text: "request", muted: true }],
  success: ({ input }) =>
    input
      ? [
          { text: "Replaced " },
          { text: truncate(input.oldText, 18), muted: true },
          { text: " → " },
          { text: truncate(input.newText, 18), muted: true },
        ]
      : [{ text: "Edited " }, { text: "request", muted: true }],
  error: () => "Failed to edit request",
} satisfies ToolDisplay<RequestRawEditInput, RequestRawEditValue>;

export const RequestRawEdit = tool({
  description:
    "Edit the raw HTTP request by replacing exact text. The oldText must match exactly (including whitespace). Use this for precise, surgical edits.",
  inputSchema,
  outputSchema,
  execute: async (
    { oldText, newText },
    { experimental_context }
  ): Promise<RequestRawEditOutput> => {
    const context = experimental_context as AgentContext;
    const before = context.httpRequest;

    const normalizedOld = normalizeCRLF(oldText);
    const resolvedNew = await resolveEnvironmentVariables(context.sdk, newText);
    const normalizedNew = normalizeCRLF(resolvedNew);

    const result = replaceUniqueText(before, normalizedOld, normalizedNew);
    if (result.kind === "Error") {
      return ToolResult.err(result.error);
    }

    context.setHttpRequest(result.value.after);

    return ToolResult.ok({
      message: `Replaced ${normalizedOld.length} characters with ${normalizedNew.length} characters`,
      before: result.value.before,
      after: result.value.after,
    });
  },
});
