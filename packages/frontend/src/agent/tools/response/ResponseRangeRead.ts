import { tool } from "ai";
import { Result } from "shared";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { fetchResponse, readContentRange } from "@/agent/utils/response";
import { isPresent } from "@/utils";

const inputSchema = z.object({
  responseId: z.coerce.string().describe("The response ID from RequestSend"),
  startIndex: z.coerce.number().int().nonnegative().describe("Start character index (inclusive)"),
  endIndex: z.coerce.number().int().positive().describe("End character index (exclusive)"),
});

const valueSchema = z.object({
  content: z.string(),
  startIndex: z.number(),
  endIndex: z.number(),
  responseLength: z.number(),
  truncated: z.boolean(),
});

const outputSchema = ToolResult.schema(valueSchema);

type ResponseRangeReadInput = z.infer<typeof inputSchema>;
type ResponseRangeReadValue = z.infer<typeof valueSchema>;
type ResponseRangeReadOutput = ToolResultType<ResponseRangeReadValue>;

export const display = {
  streaming: ({ input }) => {
    if (!isPresent(input)) {
      return [{ text: "Reading " }, { text: "response", muted: true }];
    }
    const hasIndices = isPresent(input.startIndex) && isPresent(input.endIndex);
    return [
      { text: "Reading " },
      { text: "response", muted: true },
      ...(hasIndices
        ? [{ text: " " }, { text: `[${input.startIndex}:${input.endIndex}]`, muted: true }]
        : []),
    ];
  },
  success: ({ output }) => {
    if (!isPresent(output)) {
      return [{ text: "Read " }, { text: "response", muted: true }];
    }
    const truncatedText = output.truncated ? " (truncated)" : "";
    return [
      { text: "Read " },
      { text: `${output.endIndex - output.startIndex} bytes`, muted: true },
      { text: truncatedText },
    ];
  },
  error: () => "Failed to read response",
} satisfies ToolDisplay<ResponseRangeReadInput, ResponseRangeReadValue>;

export const ResponseRangeRead = tool({
  description: `Read a specific byte range from an HTTP response by its ID.

Use startIndex/endIndex from ResponseSearch results to read around matches.

Note: Positions are character-based (not line-based) since web responses often contain minified code with very long lines.`,
  inputSchema,
  outputSchema,
  execute: async (input, { experimental_context }): Promise<ResponseRangeReadOutput> => {
    const context = experimental_context as AgentContext;

    const result = await fetchResponse(context, input.responseId);
    if (Result.isErr(result)) {
      return ToolResult.err("Response not found", result.error);
    }

    const { startIndex, endIndex } = input;

    if (startIndex >= result.value.length) {
      return ToolResult.err(
        "Start index out of bounds",
        `Start index ${startIndex} exceeds response length ${result.value.length}`
      );
    }

    const readResult = readContentRange(result.value.content, startIndex, endIndex);
    const requestedLength = Math.min(endIndex, result.value.length) - startIndex;
    const truncationNote = readResult.truncated
      ? ` (truncated to 5000 bytes, ${requestedLength - 5000} bytes remaining)`
      : "";

    return ToolResult.ok({
      message: `Read ${readResult.endIndex - readResult.startIndex} bytes from response${truncationNote}`,
      ...readResult,
      responseLength: result.value.length,
    });
  },
});
