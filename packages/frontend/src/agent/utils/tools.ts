import type { DynamicToolUIPart, ToolUIPart, UITools } from "ai";

type AnyToolPart = ToolUIPart<UITools> | DynamicToolUIPart;

const UNAVAILABLE_TOOL_PATTERN = /^Model tried to call unavailable tool/;

export function getToolErrorText(part: AnyToolPart): string | undefined {
  if (!("errorText" in part) || typeof part.errorText !== "string") {
    return undefined;
  }

  const errorText = part.errorText;

  if (UNAVAILABLE_TOOL_PATTERN.test(errorText)) {
    return "Model tried to call unavailable tool";
  }

  return errorText;
}
