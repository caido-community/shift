const TOOL_CALL_PREFIX = "Calling ";

export const createBackgroundAgentToolCallText = (toolName: string) =>
  `${TOOL_CALL_PREFIX}${toolName}`;

export const isBackgroundAgentToolCallLog = (text: string) => text.startsWith(TOOL_CALL_PREFIX);
