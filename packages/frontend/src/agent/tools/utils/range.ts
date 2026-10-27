import { ToolResult } from "@/agent/types";

type TextRange = {
  content: string;
  offset: number;
  endOffset: number;
  hasMore: boolean;
};

export function readTextRange(
  text: string,
  label: string,
  offset: number,
  limit: number
): ToolResult<TextRange> {
  if (offset >= text.length) {
    return ToolResult.err(
      "Offset out of bounds",
      `Offset ${offset} exceeds ${label} length ${text.length}`
    );
  }

  const endOffset = Math.min(text.length, offset + limit);
  return ToolResult.ok({
    message: `Read ${endOffset - offset} chars from ${label}`,
    content: text.slice(offset, endOffset),
    offset,
    endOffset,
    hasMore: endOffset < text.length,
  });
}
