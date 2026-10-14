import { isToolUIPart, type ModelMessage, type ToolResultPart } from "ai";
import type { MessageState, ShiftMessage } from "shared";

type ReasoningPart = { type: "reasoning" };

function isReasoningPart(part: { type: string }): part is ReasoningPart {
  return part.type === "reasoning";
}

export function hasDisplayableAssistantContent(message: ShiftMessage): boolean {
  return (
    message.role === "assistant" &&
    message.parts.some((part) => part !== undefined && part.type !== "step-start")
  );
}

export function markUnfinishedMessages(
  messages: ShiftMessage[],
  state: Extract<MessageState, "aborted" | "error">
): ShiftMessage[] {
  let didChange = false;
  const result = messages.map((message) => {
    const current = message.metadata?.state;
    if (message.role !== "assistant" || (current !== undefined && current !== "streaming")) {
      return message;
    }
    didChange = true;
    return { ...message, metadata: { ...message.metadata, state } };
  });
  return didChange ? result : messages;
}

// Reasoning only replays to the model that produced it; other providers reject it.
export function stripReasoningParts(
  messages: ShiftMessage[],
  keep: (message: ShiftMessage) => boolean = () => false
): ShiftMessage[] {
  let didChange = false;
  const updated: ShiftMessage[] = [];

  for (const message of messages) {
    if (message.role !== "assistant" || keep(message)) {
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

const LEGACY_TOOL_STATES: Record<string, string> = {
  result: "output-available",
  error: "output-error",
};

// convertToModelMessages drops pre-v5 states as incomplete.
export function normalizeLegacyToolStates(messages: ShiftMessage[]): ShiftMessage[] {
  let didChange = false;

  const updated = messages.map((message) => {
    if (message.role !== "assistant") {
      return message;
    }

    let didMessageChange = false;
    const parts = message.parts.map((part) => {
      const state = isToolUIPart(part) ? LEGACY_TOOL_STATES[part.state] : undefined;
      if (state === undefined) {
        return part;
      }
      didMessageChange = true;
      return { ...part, state } as typeof part;
    });

    if (!didMessageChange) {
      return message;
    }
    didChange = true;
    return { ...message, parts };
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
  return messages[findLastUserMessageIndex(messages)]?.id;
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
  const lastUserIndex = findLastUserMessageIndex(messages);
  if (lastUserIndex === -1) return false;

  return hasToolPartsSinceIndex(messages, lastUserIndex);
}

// Blob IDs must be stable per tool call or the rewritten history breaks the prompt cache.
type CreateBlobForHistory = (content: string, toolCallId: string) => { blobId: string };

const DEFAULT_MIN_OUTPUT_LENGTH_TO_REPLACE = 500;

function getToolOutputText(output: ToolResultPart["output"]): string | undefined {
  switch (output.type) {
    case "text":
      return output.value;
    case "json":
      return JSON.stringify(output.value);
    default:
      return undefined;
  }
}

export function replaceHistoricalToolOutputsWithBlobRefs(
  messages: ModelMessage[],
  createBlob: CreateBlobForHistory,
  options?: { minOutputLengthToReplace?: number }
): ModelMessage[] {
  const lastUserIndex = messages.findLastIndex((message) => message.role === "user");
  if (lastUserIndex < 0) {
    return messages;
  }

  const threshold = options?.minOutputLengthToReplace ?? DEFAULT_MIN_OUTPUT_LENGTH_TO_REPLACE;
  let didChange = false;

  const updated = messages.map((message, index): ModelMessage => {
    if (message.role !== "tool" || index >= lastUserIndex) {
      return message;
    }

    let didMessageChange = false;
    const content = message.content.map((part) => {
      if (part.type !== "tool-result") {
        return part;
      }
      const text = getToolOutputText(part.output);
      if (text === undefined || text.length < threshold) {
        return part;
      }

      didMessageChange = true;
      const { blobId } = createBlob(text, part.toolCallId);
      return {
        ...part,
        output: {
          type: "text" as const,
          value: `Read output from blob ID ${blobId} with PayloadBlobRangeRead (${text.length} chars).`,
        },
      };
    });

    if (!didMessageChange) {
      return message;
    }
    didChange = true;
    return { ...message, content };
  });

  return didChange ? updated : messages;
}

type ExtractResult = {
  remainingMessages: ShiftMessage[];
  removedText: string | undefined;
};

export function extractLastUserMessageText(messages: ShiftMessage[]): ExtractResult {
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
