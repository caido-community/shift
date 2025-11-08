import { tool } from "ai";
import { z } from "zod";

import { type ToolContext } from "@/agents/types";

const GrepRequestSchema = z
  .object({
    requestID: z.string().describe("The request ID to read from"),
    offset: z
      .number()
      .optional()
      .describe(
        "Byte offset to start reading from (only used when no content/regex is specified, default: 0)",
      ),
    length: z
      .number()
      .optional()
      .describe(
        "When content/regex is specified: number of bytes to return after the match. When no content/regex: number of bytes to read from offset (default: 5000)",
      ),
    content: z
      .string()
      .optional()
      .describe(
        "String content to search for in the entire request. When specified, offset is ignored. Cannot be used with regex parameter",
      ),
    regex: z
      .string()
      .optional()
      .describe(
        "Regular expression pattern to search for in the entire request. When specified, offset is ignored. Cannot be used with content parameter",
      ),
    occurrence: z
      .number()
      .optional()
      .describe(
        "Which occurrence of the content/regex to return (1-based index, default: 1). Only used with content or regex parameter",
      ),
  })
  .refine(
    (data) => {
      const hasContent = data.content !== undefined;
      const hasRegex = data.regex !== undefined;
      return !(hasContent && hasRegex);
    },
    {
      message: "Cannot specify both content and regex parameters",
    },
  );

export const grepRequestTool = tool({
  description:
    "Read request content in three modes: 1) Read specific bytes from offset to offset+length, 2) Search entire request for string content and return content starting from match, or 3) Search entire request for regex pattern and return content starting from match. When content or regex is provided, it searches the entire request and returns content from the specified occurrence.",
  inputSchema: GrepRequestSchema,
  execute: async (input, { experimental_context }) => {
    const context = experimental_context as ToolContext;
    try {
      const result = await context.sdk.graphql.request({
        id: input.requestID,
      });

      if (result.request === undefined || result.request === null) {
        return { error: "Failed to retrieve request" };
      }

      const fullRequest = result.request.raw;
      const length = input.length !== undefined ? input.length : 5000;

      if (input.content !== undefined || input.regex !== undefined) {
        const occurrenceIndex =
          (input.occurrence !== undefined ? input.occurrence : 1) - 1;
        const allMatches: number[] = [];

        if (input.content !== undefined) {
          let searchIndex = 0;
          while (searchIndex < fullRequest.length) {
            const foundIndex = fullRequest.indexOf(input.content, searchIndex);
            if (foundIndex === -1) break;
            allMatches.push(foundIndex);
            searchIndex = foundIndex + 1;
          }
        } else if (input.regex !== undefined) {
          try {
            const regexPattern = new RegExp(input.regex, "g");
            let match: RegExpExecArray | undefined;
            while (
              (match = regexPattern.exec(fullRequest) ?? undefined) !== undefined
            ) {
              allMatches.push(match.index);
              if (regexPattern.lastIndex === match.index) {
                regexPattern.lastIndex++;
              }
            }
          } catch (regexError) {
            const message =
              regexError instanceof Error
                ? regexError.message
                : String(regexError);
            return { error: `Invalid regex pattern: ${message}` };
          }
        }

        if (allMatches.length === 0) {
          return {
            content: "",
            found: false,
            totalBytes: fullRequest.length,
            totalMatches: 0,
            currentMatch: 0,
          };
        }
        if (occurrenceIndex >= allMatches.length) {
          return {
            content: "",
            found: false,
            totalBytes: fullRequest.length,
            totalMatches: allMatches.length,
            currentMatch: 0,
          };
        }

        const matchIndex = allMatches[occurrenceIndex];
        if (matchIndex === undefined) {
          return {
            content: "",
            found: false,
            totalBytes: fullRequest.length,
            totalMatches: allMatches.length,
            currentMatch: 0,
          };
        }

        const endOffset = Math.min(matchIndex + length, fullRequest.length);
        const content = fullRequest.slice(matchIndex, endOffset);
        return {
          content,
          found: true,
          totalBytes: fullRequest.length,
          totalMatches: allMatches.length,
          currentMatch: occurrenceIndex + 1,
        };
      } else {
        const offset = input.offset !== undefined ? input.offset : 0;
        if (offset >= fullRequest.length) {
          return { content: "", found: false, totalBytes: fullRequest.length };
        }
        const endOffset = Math.min(offset + length, fullRequest.length);
        const content = fullRequest.slice(offset, endOffset);
        return { content, found: true, totalBytes: fullRequest.length };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { error: `Error while reading request: ${message}` };
    }
  },
});

