import { isToolUIPart } from "ai";
import type { ShiftMessage } from "shared";

type ToolUIState = { state?: string };
type ReasoningPart = { type: "reasoning" };

function isReasoningPart(part: { type: string }): part is ReasoningPart {
  return part.type === "reasoning";
}

export function stripReasoningParts(messages: ShiftMessage[]): ShiftMessage[] {
  let didChange = false;
  const updated: ShiftMessage[] = [];

  for (const message of messages) {
    if (message.role !== "assistant") {
      updated.push(message);
      continue;
    }

    const filteredParts = message.parts.filter((part) => {
      if (isReasoningPart(part)) {
        didChange = true;
        return false;
      }
      return true;
    });

    if (filteredParts.length === 0) {
      didChange = true;
      continue;
    }

    if (filteredParts.length === message.parts.length) {
      updated.push(message);
      continue;
    }

    didChange = true;
    updated.push({
      ...message,
      parts: filteredParts,
    });
  }

  return didChange ? updated : messages;
}

function isFinishedToolState(state: string | undefined): boolean {
  return state === "output-available" || state === "result" || state === "error";
}

export function stripUnfinishedToolCalls(messages: ShiftMessage[]): ShiftMessage[] {
  let didChange = false;

  const updated = messages.map((message) => {
    if (message.role !== "assistant") {
      return message;
    }

    const filteredParts = message.parts.filter((part) => {
      if (!isToolUIPart(part)) {
        return true;
      }

      if (isFinishedToolState((part as ToolUIState).state)) {
        return true;
      }

      didChange = true;
      return false;
    });

    if (filteredParts.length === message.parts.length) {
      return message;
    }

    didChange = true;
    return {
      ...message,
      parts: filteredParts,
    } as ShiftMessage;
  });

  return didChange ? updated : messages;
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
