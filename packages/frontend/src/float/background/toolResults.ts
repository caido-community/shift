import { ToolResult } from "@/agent/types";
import { plainParts } from "@/backgroundAgents/logs";
import { getToolDisplayParts } from "@/backgroundAgents/toolDisplay";

const parseToolResult = (output: unknown) => {
  const parsed = ToolResult.schema().safeParse(output);
  return parsed.success ? parsed.data : undefined;
};

export const getToolErrorMessage = (output: unknown): string | undefined => {
  const result = parseToolResult(output);
  if (result?.kind !== "Error") {
    return undefined;
  }

  const { message, detail } = result.error;
  return detail === undefined || detail === "" ? message : `${message}: ${detail}`;
};

export const getToolSuccessMessage = (output: unknown): string | undefined => {
  const result = parseToolResult(output);
  if (result?.kind !== "Ok" || result.value.message.trim() === "") {
    return undefined;
  }

  return result.value.message;
};

export const getToolResultLogParts = (toolName: string, toolInput: unknown, output: unknown) => {
  const args = (toolInput ?? {}) as Record<string, unknown>;

  return (
    getToolDisplayParts(toolName, args, output) ??
    plainParts(getToolSuccessMessage(output) ?? toolName)
  );
};
