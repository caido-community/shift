import { isToolUIPart } from "ai";
import { Result } from "shared";
import type { ShiftMessage } from "shared";

type ToolUIState = { state?: string; output?: unknown };
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

function normalizeToolState(state: string | undefined): string | undefined {
  switch (state) {
    case "result":
      return "output-available";
    case "error":
      return "output-error";
    default:
      return state;
  }
}

function isIncompleteToolState(state: string | undefined): boolean {
  return state === "input-streaming" || state === "input-available";
}

function isFinishedToolState(state: string | undefined): boolean {
  const normalizedState = normalizeToolState(state);
  return normalizedState !== undefined && !isIncompleteToolState(normalizedState);
}

export function stripUnfinishedToolCalls(messages: ShiftMessage[]): ShiftMessage[] {
  let didChange = false;

  const updated = messages.map((message) => {
    if (message.role !== "assistant") {
      return message;
    }

    let didMessageChange = false;
    const filteredParts = message.parts.reduce<ShiftMessage["parts"]>((parts, part) => {
      if (!isToolUIPart(part)) {
        parts.push(part);
        return parts;
      }

      const toolPart = part as ToolUIState;
      const normalizedState = normalizeToolState(toolPart.state);

      if (isIncompleteToolState(normalizedState)) {
        didChange = true;
        didMessageChange = true;
        return parts;
      }

      if (normalizedState !== toolPart.state) {
        didChange = true;
        didMessageChange = true;
        parts.push({ ...part, state: normalizedState } as typeof part);
        return parts;
      }

      parts.push(part);
      return parts;
    }, []);

    if (!didMessageChange) {
      return message;
    }

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

/**
 * Serialize tool output to a string for storage in a blob.
 * Handles Result wrapper, plain objects, and primitives.
 */
export function serializeToolOutput(output: unknown): string {
  if (output === undefined || output === null) {
    return "";
  }
  if (Result.isResult(output)) {
    return JSON.stringify(output);
  }
  if (typeof output === "string") {
    return output;
  }
  if (typeof output === "object") {
    try {
      return JSON.stringify(output);
    } catch {
      return "[unserializable tool output]";
    }
  }
  if (typeof output === "number" || typeof output === "boolean" || typeof output === "bigint") {
    return String(output);
  }
  if (typeof output === "symbol") {
    return output.toString();
  }
  if (typeof output === "function") {
    return String(output);
  }
  return "";
}

type CreateBlobForHistory = (content: string, reason: string) => { blobId: string };

const DEFAULT_MIN_OUTPUT_LENGTH_TO_REPLACE = 500;

/**
 * Replace large tool outputs in previous turns with blob-backed placeholders.
 * Only affects assistant tool-invocation parts before the last user message.
 */
export function replaceHistoricalToolOutputsWithBlobRefs(
  messages: ShiftMessage[],
  createBlob: CreateBlobForHistory,
  options?: { minOutputLengthToReplace?: number }
): ShiftMessage[] {
  const lastUserIndex = findLastUserMessageIndex(messages);
  if (lastUserIndex < 0) {
    return messages;
  }

  const threshold = options?.minOutputLengthToReplace ?? DEFAULT_MIN_OUTPUT_LENGTH_TO_REPLACE;
  let didChange = false;
  const updated: ShiftMessage[] = [];

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]!;
    if (message.role !== "assistant" || i >= lastUserIndex) {
      updated.push(message);
      continue;
    }

    let didMessageChange = false;
    const newParts = message.parts.map((part) => {
      if (!isToolUIPart(part)) {
        return part;
      }
      const toolPart = part as ToolUIState;
      if (!isFinishedToolState(toolPart.state) || toolPart.output === undefined) {
        return part;
      }

      const serialized = serializeToolOutput(toolPart.output);
      if (serialized.length < threshold) {
        return part;
      }

      didChange = true;
      didMessageChange = true;
      const { blobId } = createBlob(
        serialized,
        `Historical tool output (${serialized.length} chars)`
      );
      const placeholder = `Read output from blob ID ${blobId} with PayloadBlobRangeRead.`;
      return {
        ...part,
        output: placeholder,
      } as typeof part;
    });

    if (!didMessageChange) {
      updated.push(message);
      continue;
    }
    updated.push({ ...message, parts: newParts } as ShiftMessage);
  }

  return didChange ? updated : messages;
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
