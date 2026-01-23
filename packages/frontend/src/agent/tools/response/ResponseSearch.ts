import { tool } from "ai";
import { Result } from "shared";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { fetchResponse, searchInContent } from "@/agent/utils/response";
import { isPresent, pluralize } from "@/utils";

const occurrenceSchema = z.object({
  index: z.number(),
  startIndex: z.number(),
  endIndex: z.number(),
  context: z.string(),
});

const inputSchema = z.object({
  responseId: z.coerce.string().describe("The response ID from RequestSend"),
  pattern: z.string().min(1).describe("The text pattern to search for (case-sensitive)"),
  caseSensitive: z
    .boolean()
    .optional()
    .describe("Whether search is case-sensitive (default: true)"),
});

const valueSchema = z.object({
  totalOccurrences: z.number(),
  returnedOccurrences: z.number(),
  occurrences: z.array(occurrenceSchema),
  responseLength: z.number(),
});

const outputSchema = ToolResult.schema(valueSchema);

type ResponseSearchInput = z.infer<typeof inputSchema>;
type ResponseSearchValue = z.infer<typeof valueSchema>;
type ResponseSearchOutput = ToolResultType<ResponseSearchValue>;

export const display = {
  streaming: ({ input }) => {
    if (!isPresent(input)) {
      return [{ text: "Searching " }, { text: "response", muted: true }];
    }
    return [
      { text: "Searching " },
      { text: "response", muted: true },
      ...(isPresent(input.pattern)
        ? [{ text: " for " }, { text: input.pattern, muted: true }]
        : []),
    ];
  },
  success: ({ input, output }) => {
    if (!isPresent(output) || !isPresent(input)) {
      return [{ text: "Searched " }, { text: "response", muted: true }];
    }
    return [
      { text: "Found " },
      {
        text: `${output.totalOccurrences} ${pluralize(output.totalOccurrences, "occurrence")}`,
        muted: true,
      },
      { text: " of " },
      { text: input.pattern, muted: true },
    ];
  },
  error: () => "Failed to search response",
} satisfies ToolDisplay<ResponseSearchInput, ResponseSearchValue>;

export const ResponseSearch = tool({
  description: `Search for a pattern in an HTTP response by its ID.

Returns all occurrences with their positions (character indices) and surrounding context.
Use the returned startIndex/endIndex with ResponseRangeRead to read around matches.

Note: Positions are character-based (not line-based) since web responses often contain minified code with very long lines.`,
  inputSchema,
  outputSchema,
  execute: async (input, { experimental_context }): Promise<ResponseSearchOutput> => {
    const context = experimental_context as AgentContext;

    const result = await fetchResponse(context, input.responseId);
    if (Result.isErr(result)) {
      return ToolResult.err("Response not found", result.error);
    }

    const caseSensitive = input.caseSensitive ?? true;
    const searchResult = searchInContent(result.value.content, input.pattern, caseSensitive);

    return ToolResult.ok({
      message:
        searchResult.totalOccurrences > 0
          ? `Found ${searchResult.totalOccurrences} ${pluralize(searchResult.totalOccurrences, "occurrence")} of "${input.pattern}"`
          : `No occurrences of "${input.pattern}" found`,
      ...searchResult,
      responseLength: result.value.length,
    });
  },
});
