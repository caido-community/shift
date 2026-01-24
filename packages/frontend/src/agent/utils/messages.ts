import {
  type AssistantModelMessage,
  isToolUIPart,
  type ModelMessage,
  type ToolModelMessage,
} from "ai";
import type { ShiftMessage } from "shared";

type ToolCallPart = { type: "tool-call"; toolCallId: string };
type ToolResultPart = { type: "tool-result"; toolCallId: string };

function isToolCallPart(part: { type: string }): part is ToolCallPart {
  return part.type === "tool-call";
}

function isToolResultPart(part: { type: string }): part is ToolResultPart {
  return part.type === "tool-result";
}

export function trimOldToolCalls(
  messages: ModelMessage[],
  keepRecentCount: number
): ModelMessage[] {
  if (messages.length <= keepRecentCount) {
    return messages;
  }

  const cutoffIndex = messages.length - keepRecentCount;
  const removedToolCallIds = new Set<string>();

  for (let i = 0; i < cutoffIndex; i++) {
    const msg = messages[i];
    if (msg?.role === "assistant" && typeof msg.content !== "string") {
      for (const part of msg.content) {
        if (isToolCallPart(part)) {
          removedToolCallIds.add(part.toolCallId);
        }
      }
    }
  }

  return messages.map((msg, index): ModelMessage => {
    if (msg.role === "tool") {
      const filteredContent = msg.content.filter(
        (part) => !isToolResultPart(part) || !removedToolCallIds.has(part.toolCallId)
      );
      if (filteredContent.length === msg.content.length) {
        return msg;
      }
      return {
        ...msg,
        content: filteredContent,
      } as ToolModelMessage;
    }

    if (index >= cutoffIndex) {
      return msg;
    }

    if (msg.role === "assistant") {
      if (typeof msg.content === "string") {
        return msg;
      }
      return {
        ...msg,
        content: msg.content.filter((part) => !isToolCallPart(part)),
      } as AssistantModelMessage;
    }

    return msg;
  });
}

export function findLastUserMessageIndex(messages: ShiftMessage[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]!.role === "user") {
      return i;
    }
  }
  return -1;
}

export function findLastUserMessageId(messages: ShiftMessage[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg?.role === "user") {
      return msg.id;
    }
  }
  return undefined;
}

export function hasToolPartsSinceIndex(messages: ShiftMessage[], fromIndex: number): boolean {
  for (let i = fromIndex + 1; i < messages.length; i++) {
    const message = messages[i]!;
    if (message.role === "assistant") {
      for (const part of message.parts) {
        if (isToolUIPart(part)) {
          return true;
        }
      }
    }
  }
  return false;
}

export function hasToolPartsSinceLastUserMessage(messages: ShiftMessage[]): boolean {
  if (messages.length === 0) return false;

  const lastUserIndex = findLastUserMessageIndex(messages);
  if (lastUserIndex === -1) return false;

  return hasToolPartsSinceIndex(messages, lastUserIndex);
}

type ExtractResult = {
  remainingMessages: ShiftMessage[];
  removedText: string | undefined;
};

export function extractLastUserMessageText(messages: ShiftMessage[]): ExtractResult {
  if (messages.length === 0) {
    return { remainingMessages: [], removedText: undefined };
  }

  const lastUserIndex = findLastUserMessageIndex(messages);
  if (lastUserIndex === -1) {
    return { remainingMessages: messages, removedText: undefined };
  }

  const lastUserMessage = messages[lastUserIndex]!;
  const remainingMessages = messages.slice(0, lastUserIndex);

  const removedText = lastUserMessage.parts
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("");

  return { remainingMessages, removedText };
}
