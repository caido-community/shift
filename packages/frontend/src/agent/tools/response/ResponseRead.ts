import { tool } from "ai";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { readContentRange, searchInContent } from "@/agent/utils/response";
import { isPresent, pluralize } from "@/utils";

const occurrenceSchema = z.object({
  index: z.number(),
  startIndex: z.number(),
  endIndex: z.number(),
  context: z.string(),
});

const searchResultSchema = z.object({
  totalOccurrences: z.number(),
  returnedOccurrences: z.number(),
  occurrences: z.array(occurrenceSchema),
  responseLength: z.number(),
});

const readResultSchema = z.object({
  content: z.string(),
  startIndex: z.number(),
  endIndex: z.number(),
  responseLength: z.number(),
  truncated: z.boolean(),
});

const inputSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("search"),
    responseId: z.coerce.string().describe("The response ID from RequestSend"),
    pattern: z.string().min(1).describe("The text pattern to search for (case-sensitive)"),
    caseSensitive: z
      .boolean()
      .optional()
      .describe("Whether search is case-sensitive (default: true)"),
  }),
  z.object({
    mode: z.literal("read"),
    responseId: z.coerce.string().describe("The response ID from RequestSend"),
    startIndex: z.coerce.number().int().nonnegative().describe("Start character index (inclusive)"),
    endIndex: z.coerce.number().int().positive().describe("End character index (exclusive)"),
  }),
]);

const valueSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("search") }).merge(searchResultSchema),
  z.object({ mode: z.literal("read") }).merge(readResultSchema),
]);

const outputSchema = ToolResult.schema(valueSchema);

type ResponseReadInput = z.infer<typeof inputSchema>;
type ResponseReadValue = z.infer<typeof valueSchema>;
type ResponseReadOutput = ToolResultType<ResponseReadValue>;
export const display = {
  streaming: ({ input }) => {
    if (!isPresent(input)) {
      return [{ text: "Reading " }, { text: "response", muted: true }];
    }
    switch (input.mode) {
      case "search":
        return [
          { text: "Searching " },
          { text: "response", muted: true },
          ...(isPresent(input.pattern)
            ? [{ text: " for " }, { text: input.pattern, muted: true }]
            : []),
        ];
      case "read": {
        const hasIndices = isPresent(input.startIndex) && isPresent(input.endIndex);
        return [
          { text: "Reading " },
          { text: "response", muted: true },
          ...(hasIndices
            ? [{ text: " " }, { text: `[${input.startIndex}:${input.endIndex}]`, muted: true }]
            : []),
        ];
      }
    }
  },
  success: ({ input, output }) => {
    if (!isPresent(output) || !isPresent(input)) {
      return [{ text: "Read " }, { text: "response", muted: true }];
    }
    switch (output.mode) {
      case "search": {
        const pattern = input.mode === "search" ? input.pattern : "";
        return [
          { text: "Found " },
          {
            text: `${output.totalOccurrences} ${pluralize(output.totalOccurrences, "occurrence")}`,
            muted: true,
          },
          { text: " of " },
          { text: pattern, muted: true },
        ];
      }
      case "read": {
        const truncatedText = output.truncated ? " (truncated)" : "";
        return [
          { text: "Read " },
          { text: `${output.endIndex - output.startIndex} bytes`, muted: true },
          { text: truncatedText },
        ];
      }
    }
  },
  error: ({ input }) => {
    if (!isPresent(input)) {
      return "Failed to read response";
    }
    switch (input.mode) {
      case "search":
        return "Failed to search response";
      case "read":
        return "Failed to read response";
    }
  },
} satisfies ToolDisplay<ResponseReadInput, ResponseReadValue>;

export const ResponseRead = tool({
  description: `Read or search through an HTTP response by its ID.

Modes:
- "search": Find all occurrences of a pattern. Returns positions (character indices) and surrounding context. Use for grep-like searching.
- "read": Read a specific byte range. Use startIndex/endIndex from search results to read around matches.

Note: Positions are character-based (not line-based) since web responses often contain minified code with very long lines.`,
  inputSchema,
  outputSchema,
  execute: async (input, { experimental_context }): Promise<ResponseReadOutput> => {
    const context = experimental_context as AgentContext;
    const sdk = context.sdk;

    const result = await sdk.graphql.response({
      id: input.responseId,
    });

    if (!isPresent(result.response)) {
      return ToolResult.err("Response not found", `No response with ID: ${input.responseId}`);
    }

    const responseContent = result.response.raw;
    const responseLength = responseContent.length;

    switch (input.mode) {
      case "search": {
        const caseSensitive = input.caseSensitive ?? true;
        const searchResult = searchInContent(responseContent, input.pattern, caseSensitive);

        return ToolResult.ok({
          message:
            searchResult.totalOccurrences > 0
              ? `Found ${searchResult.totalOccurrences} ${pluralize(searchResult.totalOccurrences, "occurrence")} of "${input.pattern}"`
              : `No occurrences of "${input.pattern}" found`,
          mode: "search" as const,
          ...searchResult,
          responseLength,
        });
      }
      case "read": {
        const { startIndex, endIndex } = input;

        if (startIndex >= responseLength) {
          return ToolResult.err(
            "Start index out of bounds",
            `Start index ${startIndex} exceeds response length ${responseLength}`
          );
        }

        const readResult = readContentRange(responseContent, startIndex, endIndex);
        const requestedLength = Math.min(endIndex, responseLength) - startIndex;
        const truncationNote = readResult.truncated
          ? ` (truncated to 5000 bytes, ${requestedLength - 5000} bytes remaining)`
          : "";

        return ToolResult.ok({
          message: `Read ${readResult.endIndex - readResult.startIndex} bytes from response${truncationNote}`,
          mode: "read" as const,
          ...readResult,
          responseLength,
        });
      }
      default:
        return ToolResult.err("Invalid mode", `Model provided invalid mode`);
    }
  },
});
