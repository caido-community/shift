type InvalidToolCall = {
  toolName: string;
  invalid?: boolean;
  error?: unknown;
};

export const isInvalidToolCall = (toolCall: unknown): toolCall is InvalidToolCall => {
  if (typeof toolCall !== "object" || toolCall === null) {
    return false;
  }

  return "invalid" in toolCall && toolCall.invalid === true;
};

export const isValidToolCall = (toolCall: unknown): boolean => !isInvalidToolCall(toolCall);

export const getInvalidToolCallMessage = (toolCall: InvalidToolCall): string => {
  const detail =
    typeof toolCall.error === "string"
      ? toolCall.error
      : toolCall.toolName === "backgroundAgentSpawn"
        ? "background agents cannot spawn other background agents"
        : "invalid tool input";

  return `${toolCall.toolName}: ${detail}`;
};
