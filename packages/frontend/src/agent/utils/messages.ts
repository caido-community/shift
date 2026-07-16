import { isToolUIPart, type ModelMessage } from "ai";
import { Result } from "shared";
import type { ShiftMessage } from "shared";

import { hasThinkTag, stripThinkTags } from "@/utils";

type ToolUIState = { state?: string; output?: unknown };
type ReasoningPart = { type: "reasoning" };

function isReasoningPart(part: { type: string }): part is ReasoningPart {
  return part.type === "reasoning";
}

/**
 * Remove inline `<think>...</think>` blocks from assistant text parts.
 *
 * Some providers (e.g. qwen served via Ollama/LiteLLM) stream reasoning inline in
 * the text content instead of as a dedicated `reasoning` part. `stripReasoningParts`
 * only drops `reasoning`-typed parts, so those inline blocks survive into replayed
 * history and inflate context on every turn. Assistant messages that become empty
 * (and carry no tool parts) are dropped, mirroring `stripReasoningParts`.
 */
export function stripInlineThinkTags(messages: ShiftMessage[]): ShiftMessage[] {
  let didChange = false;
  const updated: ShiftMessage[] = [];

  for (const message of messages) {
    if (message.role !== "assistant") {
      updated.push(message);
      continue;
    }

    let didMessageChange = false;
    const newParts: ShiftMessage["parts"] = [];

    for (const part of message.parts) {
      if (part.type !== "text" || !hasThinkTag(part.text)) {
        newParts.push(part);
        continue;
      }

      const cleaned = stripThinkTags(part.text);
      didMessageChange = true;
      didChange = true;

      if (cleaned.length > 0) {
        newParts.push({ ...part, text: cleaned });
      }
    }

    if (!didMessageChange) {
      updated.push(message);
      continue;
    }

    if (newParts.length === 0) {
      continue;
    }

    updated.push({ ...message, parts: newParts });
  }

  return didChange ? updated : messages;
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

type ToolCallRef = { toolCallId: string; toolName: string };

const UNFULFILLED_TOOL_CALL_MESSAGE =
  "Tool call was not executed (invalid arguments or unfulfilled). Treat it as failed. " +
  "Do not repeat the same call verbatim — fix the arguments or take a different step.";

function assistantToolCalls(message: ModelMessage): ToolCallRef[] {
  if (message.role !== "assistant" || typeof message.content === "string") {
    return [];
  }
  const calls: ToolCallRef[] = [];
  for (const part of message.content) {
    if (part.type === "tool-call") {
      calls.push({ toolCallId: part.toolCallId, toolName: part.toolName });
    }
  }
  return calls;
}

function toolResultIds(message: ModelMessage): string[] {
  if (message.role !== "tool" || typeof message.content === "string") {
    return [];
  }
  const ids: string[] = [];
  for (const part of message.content) {
    if (part.type === "tool-result") {
      ids.push(part.toolCallId);
    }
  }
  return ids;
}

/**
 * Guarantee the OpenAI tool-use contract: every assistant `tool-call` is answered by
 * exactly one `tool` result before the next model turn.
 *
 * When a tool call fails input validation and can't be repaired it is never executed,
 * so no result is produced. Left as-is, the wire contains consecutive assistant
 * `tool-call` messages with no intervening `tool` message — a contract violation that
 * lenient backends accept and then loop on. For any unanswered call we splice in a
 * synthetic error result telling the model the call failed, so it can correct instead
 * of re-issuing it forever.
 */
export function ensureToolCallsResolved(messages: ModelMessage[]): ModelMessage[] {
  let didChange = false;
  const result: ModelMessage[] = [];

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]!;
    result.push(message);

    const toolCalls = assistantToolCalls(message);
    if (toolCalls.length === 0) {
      continue;
    }

    const resolved = new Set<string>();
    for (let j = i + 1; j < messages.length && messages[j]!.role === "tool"; j++) {
      for (const id of toolResultIds(messages[j]!)) {
        resolved.add(id);
      }
    }

    const missing = toolCalls.filter((call) => !resolved.has(call.toolCallId));
    if (missing.length === 0) {
      continue;
    }

    didChange = true;
    result.push({
      role: "tool",
      content: missing.map((call) => ({
        type: "tool-result",
        toolCallId: call.toolCallId,
        toolName: call.toolName,
        output: { type: "error-text", value: UNFULFILLED_TOOL_CALL_MESSAGE },
      })),
    } as ModelMessage);
  }

  return didChange ? result : messages;
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
