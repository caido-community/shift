export const getInvalidToolCallMessage = (toolCall: {
  toolName: string;
  error?: unknown;
}): string => {
  const detail =
    typeof toolCall.error === "string"
      ? toolCall.error
      : toolCall.toolName === "backgroundAgentSpawn"
        ? "background agents cannot spawn other background agents"
        : "invalid tool input";

  return `${toolCall.toolName}: ${detail}`;
};
