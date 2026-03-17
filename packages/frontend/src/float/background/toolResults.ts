import { fallbackToolParts, getToolDisplayParts } from "../../backgroundAgents/toolDisplay";
import { ActionResult } from "../types";

export const getToolErrorMessage = (output: unknown): string | undefined => {
  if (!ActionResult.isErr(output)) {
    return undefined;
  }

  return output.error.message;
};

export const getToolSuccessMessage = (output: unknown): string | undefined => {
  if (!ActionResult.isOk(output)) {
    return undefined;
  }

  const message = output.value.message;
  if (message.trim() !== "") {
    return message;
  }

  return undefined;
};

export const getToolResultLogParts = (toolName: string, toolInput: unknown, output: unknown) => {
  const args = (toolInput ?? {}) as Record<string, unknown>;

  return (
    getToolDisplayParts(toolName, args, output) ??
    fallbackToolParts(toolName, getToolSuccessMessage(output))
  );
};
