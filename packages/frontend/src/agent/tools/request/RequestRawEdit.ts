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
    "Perform a precise find-and-replace edit on the raw HTTP request text. Use this for surgical modifications that other tools can't handle - editing specific parts of headers, modifying request line components, or making changes that span multiple parts of the request. The oldText must match exactly one location in the request (including whitespace, line endings, and case). If oldText matches zero times or more than once, the operation fails with an error. The newText supports environment variable substitution using {{VAR_NAME}} syntax. Line endings are normalized to CRLF. For simpler modifications, prefer the specific tools (RequestHeaderSet, RequestBodySet, etc.) as they're less error-prone.",
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

    const truncated = result.value.after.length > MAX_LENGTH;
    const preview = truncated ? result.value.after.slice(0, MAX_LENGTH) : result.value.after;
    const truncationNote = truncated ? "\n\n[... truncated]" : "";
    return ToolResult.ok({
      message: `Replaced ${normalizedOld.length} characters with ${normalizedNew.length} characters\n\n${preview}${truncationNote}`,
    });
  },
});
