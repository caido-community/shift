import { tool } from "ai";
import { z } from "zod";

import { type ToolContext } from "@/agents/types";

const GrepResponseSchema = z
  .object({
    responseID: z
      .string()
      .describe("The string representation of the response ID to read from"),
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
        "String content to search for in the entire response. When specified, offset is ignored. Cannot be used with regex parameter",
      ),
    regex: z
      .string()
      .optional()
      .describe(
        "Regular expression pattern to search for in the entire response. When specified, offset is ignored. Cannot be used with content parameter",
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

// TODO: simplify this, i think AI will have issues with this complex input
export const grepResponseTool = tool({
  description: `The grepResponse tool is used to read data about a response. It is useful for investigating how other responses in Caido look, what cookies, parameter, etc are being sent.
    This tool should be used to get data like: headers, response bodies etc
    This tool should be used to investigate parts of a response that are interesting to give more context on how the app/api/domain works.
    Read response content in three modes: 
    1) Read specific bytes from offset to offset+length, 
    2) Search entire response for string content and return content starting from match, 
    or 3) Search entire response for regex pattern and return content starting from match. 
    When content or regex is provided, it searches the entire response and returns content from the specified occurrence.`,
  inputSchema: GrepResponseSchema,
  execute: async (input, { experimental_context }) => {
    const context = experimental_context as ToolContext;
    try {
      const result = await context.sdk.graphql.response({
        id: input.responseID,
      });

      if (result.response === undefined || result.response === null) {
        return { error: "Failed to retrieve response" };
      }

      const fullResponse = result.response.raw;
      const length = input.length !== undefined ? input.length : 5000;

      if (input.content !== undefined || input.regex !== undefined) {
        const occurrenceIndex =
          (input.occurrence !== undefined ? input.occurrence : 1) - 1;
        const allMatches: number[] = [];

        if (input.content !== undefined) {
          let searchIndex = 0;
          while (searchIndex < fullResponse.length) {
            const foundIndex = fullResponse.indexOf(input.content, searchIndex);
            if (foundIndex === -1) break;
            allMatches.push(foundIndex);
            searchIndex = foundIndex + 1;
          }
        } else if (input.regex !== undefined) {
          try {
            const regexPattern = new RegExp(input.regex, "g");
            let match: RegExpExecArray | undefined;
            while (
              (match = regexPattern.exec(fullResponse) ?? undefined) !==
              undefined
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
            totalBytes: fullResponse.length,
            totalMatches: 0,
            currentMatch: 0,
          };
        }
        if (occurrenceIndex >= allMatches.length) {
          return {
            content: "",
            found: false,
            totalBytes: fullResponse.length,
            totalMatches: allMatches.length,
            currentMatch: 0,
          };
        }

        const matchIndex = allMatches[occurrenceIndex];
        if (matchIndex === undefined) {
          return {
            content: "",
            found: false,
            totalBytes: fullResponse.length,
            totalMatches: allMatches.length,
            currentMatch: 0,
          };
        }

        const endOffset = Math.min(matchIndex + length, fullResponse.length);
        const content = fullResponse.slice(matchIndex, endOffset);
        return {
          content,
          found: true,
          totalBytes: fullResponse.length,
          totalMatches: allMatches.length,
          currentMatch: occurrenceIndex + 1,
        };
      } else {
        const offset = input.offset !== undefined ? input.offset : 0;
        if (offset >= fullResponse.length) {
          return { content: "", found: false, totalBytes: fullResponse.length };
        }
        const endOffset = Math.min(offset + length, fullResponse.length);
        const content = fullResponse.slice(offset, endOffset);
        return { content, found: true, totalBytes: fullResponse.length };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { error: `Error while reading response: ${message}` };
    }
  },
});
