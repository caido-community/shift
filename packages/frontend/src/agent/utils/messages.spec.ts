import type { ShiftMessage } from "shared";
import { describe, expect, it } from "vitest";

import {
  extractLastUserMessageText,
  findLastUserMessageId,
  findLastUserMessageIndex,
  hasToolPartsSinceIndex,
  hasToolPartsSinceLastUserMessage,
} from "./messages";

function createUserMessage(text: string, id = "u1"): ShiftMessage {
  return {
    id,
    role: "user",
    parts: [{ type: "text", text }],
  } as ShiftMessage;
}

function createAssistantMessage(id = "a1"): ShiftMessage {
  return {
    id,
    role: "assistant",
    parts: [{ type: "text", text: "Hello" }],
  } as ShiftMessage;
}

function createAssistantMessageWithTool(id = "a1"): ShiftMessage {
  return {
    id,
    role: "assistant",
    parts: [
      { type: "text", text: "Using tool" },
      {
        type: "tool-invocation",
        toolCallId: "tc1",
        toolName: "TestTool",
        args: {},
        state: "result",
      },
    ],
  } as ShiftMessage;
}

function createUserMessageWithMultipleParts(id = "u1"): ShiftMessage {
  return {
    id,
    role: "user",
    parts: [
      { type: "text", text: "Hello " },
      { type: "text", text: "World" },
      { type: "file", file: { name: "test.txt" } },
    ],
  } as ShiftMessage;
}

describe("findLastUserMessageIndex", () => {
  it("returns -1 for empty messages array", () => {
    expect(findLastUserMessageIndex([])).toBe(-1);
  });

  it("returns -1 when no user messages exist", () => {
    const messages = [createAssistantMessage()];
    expect(findLastUserMessageIndex(messages)).toBe(-1);
  });

  it("returns index when user message is at the end", () => {
    const messages = [createAssistantMessage(), createUserMessage("Hi")];
    expect(findLastUserMessageIndex(messages)).toBe(1);
  });

  it("returns index when user message is in the middle", () => {
    const messages = [
      createUserMessage("First"),
      createAssistantMessage(),
      createUserMessage("Second"),
      createAssistantMessage("a2"),
    ];
    expect(findLastUserMessageIndex(messages)).toBe(2);
  });

  it("returns last user index when multiple user messages exist", () => {
    const messages = [
      createUserMessage("First", "u1"),
      createUserMessage("Second", "u2"),
      createUserMessage("Third", "u3"),
    ];
    expect(findLastUserMessageIndex(messages)).toBe(2);
  });
});

describe("findLastUserMessageId", () => {
  it("returns undefined for empty messages array", () => {
    expect(findLastUserMessageId([])).toBeUndefined();
  });

  it("returns undefined when no user messages exist", () => {
    const messages = [createAssistantMessage()];
    expect(findLastUserMessageId(messages)).toBeUndefined();
  });

  it("returns ID of the last user message", () => {
    const messages = [createAssistantMessage(), createUserMessage("Hi", "user-123")];
    expect(findLastUserMessageId(messages)).toBe("user-123");
  });

  it("returns ID of the last user message when multiple exist", () => {
    const messages = [
      createUserMessage("First", "u1"),
      createAssistantMessage(),
      createUserMessage("Second", "u2"),
      createAssistantMessage("a2"),
    ];
    expect(findLastUserMessageId(messages)).toBe("u2");
  });

  it("returns ID of last message when all are user messages", () => {
    const messages = [
      createUserMessage("First", "u1"),
      createUserMessage("Second", "u2"),
      createUserMessage("Third", "u3"),
    ];
    expect(findLastUserMessageId(messages)).toBe("u3");
  });
});

describe("hasToolPartsSinceIndex", () => {
  it("returns false for empty messages array", () => {
    expect(hasToolPartsSinceIndex([], 0)).toBe(false);
  });

  it("returns false when no messages after index", () => {
    const messages = [createUserMessage("Hi")];
    expect(hasToolPartsSinceIndex(messages, 0)).toBe(false);
  });

  it("returns false when assistant has no tool parts", () => {
    const messages = [createUserMessage("Hi"), createAssistantMessage()];
    expect(hasToolPartsSinceIndex(messages, 0)).toBe(false);
  });

  it("returns true when assistant has tool parts after index", () => {
    const messages = [createUserMessage("Hi"), createAssistantMessageWithTool()];
    expect(hasToolPartsSinceIndex(messages, 0)).toBe(true);
  });

  it("returns false when tool part is before the index", () => {
    const messages = [
      createAssistantMessageWithTool(),
      createUserMessage("Hi"),
      createAssistantMessage(),
    ];
    expect(hasToolPartsSinceIndex(messages, 1)).toBe(false);
  });

  it("ignores user messages when scanning for tool parts", () => {
    const messages = [
      createUserMessage("First"),
      createUserMessage("Second"),
      createAssistantMessage(),
    ];
    expect(hasToolPartsSinceIndex(messages, 0)).toBe(false);
  });
});

describe("hasToolPartsSinceLastUserMessage", () => {
  it("returns false for empty messages array", () => {
    expect(hasToolPartsSinceLastUserMessage([])).toBe(false);
  });

  it("returns false when no user messages exist", () => {
    const messages = [createAssistantMessage()];
    expect(hasToolPartsSinceLastUserMessage(messages)).toBe(false);
  });

  it("returns false when user message is last", () => {
    const messages = [createAssistantMessage(), createUserMessage("Hi")];
    expect(hasToolPartsSinceLastUserMessage(messages)).toBe(false);
  });

  it("returns false when assistant after user has no tool parts", () => {
    const messages = [createUserMessage("Hi"), createAssistantMessage()];
    expect(hasToolPartsSinceLastUserMessage(messages)).toBe(false);
  });

  it("returns true when assistant after user has tool parts", () => {
    const messages = [createUserMessage("Hi"), createAssistantMessageWithTool()];
    expect(hasToolPartsSinceLastUserMessage(messages)).toBe(true);
  });

  it("only checks after the last user message", () => {
    const messages = [
      createUserMessage("First"),
      createAssistantMessageWithTool(),
      createUserMessage("Second"),
      createAssistantMessage(),
    ];
    expect(hasToolPartsSinceLastUserMessage(messages)).toBe(false);
  });

  it("returns true for tool parts after the last of multiple user messages", () => {
    const messages = [
      createUserMessage("First"),
      createAssistantMessage("a1"),
      createUserMessage("Second"),
      createAssistantMessageWithTool("a2"),
    ];
    expect(hasToolPartsSinceLastUserMessage(messages)).toBe(true);
  });
});

describe("extractLastUserMessageText", () => {
  it("returns empty result for empty messages array", () => {
    const result = extractLastUserMessageText([]);
    expect(result).toEqual({ remainingMessages: [], removedText: undefined });
  });

  it("returns all messages and undefined text when no user messages", () => {
    const messages = [createAssistantMessage()];
    const result = extractLastUserMessageText(messages);
    expect(result.remainingMessages).toEqual(messages);
    expect(result.removedText).toBeUndefined();
  });

  it("removes single user message and returns its text", () => {
    const messages = [createUserMessage("Hello")];
    const result = extractLastUserMessageText(messages);
    expect(result.remainingMessages).toHaveLength(0);
    expect(result.removedText).toBe("Hello");
  });

  it("removes only the last user message", () => {
    const messages = [
      createUserMessage("First", "u1"),
      createAssistantMessage(),
      createUserMessage("Second", "u2"),
    ];
    const result = extractLastUserMessageText(messages);
    expect(result.remainingMessages).toHaveLength(2);
    expect(result.remainingMessages[0]!.id).toBe("u1");
    expect(result.remainingMessages[1]!.id).toBe("a1");
    expect(result.removedText).toBe("Second");
  });

  it("concatenates multiple text parts", () => {
    const messages = [createUserMessageWithMultipleParts()];
    const result = extractLastUserMessageText(messages);
    expect(result.removedText).toBe("Hello World");
  });

  it("filters to text parts only", () => {
    const messages = [createUserMessageWithMultipleParts()];
    const result = extractLastUserMessageText(messages);
    expect(result.removedText).toBe("Hello World");
  });

  it("preserves messages before the removed user message", () => {
    const messages = [
      createAssistantMessage("a1"),
      createUserMessage("Question"),
      createAssistantMessage("a2"),
      createUserMessage("Follow-up"),
    ];
    const result = extractLastUserMessageText(messages);
    expect(result.remainingMessages).toHaveLength(3);
    expect(result.removedText).toBe("Follow-up");
  });

  it("creates a new array instance", () => {
    const messages = [createUserMessage("Hi")];
    const result = extractLastUserMessageText(messages);
    expect(result.remainingMessages).not.toBe(messages);
  });
});
