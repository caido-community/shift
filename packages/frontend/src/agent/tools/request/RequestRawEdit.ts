import { tool } from "ai";
import { z } from "zod";

import { editRequest } from "./editRequest";
import { createRequestModelOutput } from "./modelOutput";

import type { AgentContext } from "@/agent/context";
import { resolveToolInputPlaceholders } from "@/agent/tools/utils/placeholders";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { normalizeCRLF, normalizeRawHttpRequest } from "@/agent/utils/http";
import { replaceUniqueText } from "@/agent/utils/text";
import { truncate } from "@/utils";

const inputSchema = z.object({
  oldText: z.string().describe("Exact text to find and replace (must match exactly)"),
  newText: z
    .string()
    .describe(
      "New text to replace the old text with. Supports placeholders like §§§Env§EnvironmentName§Variable_Name§§§ and §§§Blob§blobId§§§"
    ),
});

const outputSchema = ToolResult.schema();

type RequestRawEditInput = z.infer<typeof inputSchema>;
type RequestRawEditOutput = ToolResultType;

export const display = {
  streaming: ({ input }) =>
    input
      ? [
          { text: "Replacing " },
          { text: truncate(input.oldText, 18), muted: true },
          { text: " → " },
          { text: truncate(input.newText, 56), muted: true },
        ]
      : [{ text: "Editing " }, { text: "request", muted: true }],
  success: ({ input }) =>
    input
      ? [
          { text: "Replaced " },
          { text: truncate(input.oldText, 18), muted: true },
          { text: " → " },
          { text: truncate(input.newText, 56), muted: true },
        ]
      : [{ text: "Edited " }, { text: "request", muted: true }],
  error: () => "Failed to edit request",
} satisfies ToolDisplay<RequestRawEditInput>;

const MAX_LENGTH = 2000;

export const RequestRawEdit = tool({
  description:
    "Edit the current raw HTTP request by replacing exact text. Use this for any change: method, path, query parameters, headers, cookies, or part of the body. To add a header, replace an existing header line with itself plus the new line; to remove something, replace it with an empty string. oldText must match exactly one location (including whitespace and case); include surrounding text to make it unique. Values are written as-is, so URL-encode query and path values yourself. Line endings are normalized to CRLF. newText supports placeholders like §§§Env§EnvironmentName§Variable_Name§§§ and §§§Blob§blobId§§§. Use RequestBodySet to replace the whole body and RequestRawSet to rewrite the whole request.",
  inputSchema,
  outputSchema,
  execute: async (
    { oldText, newText },
    { experimental_context, toolCallId }
  ): Promise<RequestRawEditOutput> => {
    const context = experimental_context as AgentContext;

    const normalizedOld = normalizeCRLF(oldText);
    const resolvedNewResult = await resolveToolInputPlaceholders(context, newText);
    if (resolvedNewResult.kind === "Error") {
      return ToolResult.err("Failed to resolve placeholders", resolvedNewResult.error);
    }
    const resolvedNew = resolvedNewResult.value;
    const normalizedNew = normalizeCRLF(resolvedNew);

    const before = normalizeCRLF(context.httpRequest);
    const result = replaceUniqueText(before, normalizedOld, normalizedNew);
    if (result.kind === "Error") {
      return ToolResult.err(result.error);
    }

    const after = normalizeRawHttpRequest(result.value.after);
    editRequest(context, toolCallId, after);

    const truncated = after.length > MAX_LENGTH;
    const preview = truncated ? after.slice(0, MAX_LENGTH) : after;
    const truncationNote = truncated ? "\n\n[... truncated]" : "";
    return ToolResult.ok({
      message: `Replaced ${normalizedOld.length} characters with ${normalizedNew.length} characters\n\n${preview}${truncationNote}`,
    });
  },
  toModelOutput: createRequestModelOutput({
    errorPrefix: "Failed to edit request",
  }),
});
