import type { ModelMessage } from "ai";
import type { ShiftMessage } from "shared";
import { describe, expect, it } from "vitest";

import {
  extractLastUserMessageText,
  findLastUserMessageId,
  findLastUserMessageIndex,
  hasToolPartsSinceIndex,
  hasToolPartsSinceLastUserMessage,
  stripUnfinishedToolCalls,
  trimOldToolCalls,
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

function createAssistantMessageWithToolState(state: string, id = "a1"): ShiftMessage {
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
        state,
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

function createModelUserMessage(text: string): ModelMessage {
  return {
    role: "user",
    content: [{ type: "text", text }],
  };
}

function createModelAssistantMessage(text: string): ModelMessage {
  return {
    role: "assistant",
    content: [{ type: "text", text }],
  };
}

function createModelAssistantWithToolCall(
  text: string,
  toolCallId: string,
  toolName: string
): ModelMessage {
  return {
    role: "assistant",
    content: [
      { type: "text", text },
      {
        type: "tool-call",
        toolCallId,
        toolName,
        input: {},
      },
    ],
  } as ModelMessage;
}

function createModelToolMessage(toolCallId: string, toolName: string): ModelMessage {
  return {
    role: "tool",
    content: [
      {
        type: "tool-result",
        toolCallId,
        toolName,
        output: { type: "json", value: { result: "ok" } },
      },
    ],
  } as ModelMessage;
}

describe("trimOldToolCalls", () => {
  it("returns messages unchanged when length is within keepRecentCount", () => {
    const messages: ModelMessage[] = [
      createModelUserMessage("Hello"),
      createModelAssistantWithToolCall("Using tool", "tc1", "TestTool"),
      createModelToolMessage("tc1", "TestTool"),
    ];
    const result = trimOldToolCalls(messages, 5);
    expect(result).toEqual(messages);
  });

  it("returns messages unchanged when length equals keepRecentCount", () => {
    const messages: ModelMessage[] = [
      createModelUserMessage("Hello"),
      createModelAssistantWithToolCall("Using tool", "tc1", "TestTool"),
      createModelToolMessage("tc1", "TestTool"),
    ];
    const result = trimOldToolCalls(messages, 3);
    expect(result).toEqual(messages);
  });

  it("removes tool-call parts from old assistant messages", () => {
    const messages: ModelMessage[] = [
      createModelUserMessage("First"),
      createModelAssistantWithToolCall("Old tool call", "tc1", "OldTool"),
      createModelToolMessage("tc1", "OldTool"),
      createModelUserMessage("Second"),
      createModelAssistantWithToolCall("Recent tool call", "tc2", "RecentTool"),
      createModelToolMessage("tc2", "RecentTool"),
    ];
    const result = trimOldToolCalls(messages, 3);

    const oldAssistant = result[1] as { content: { type: string }[] };
    expect(oldAssistant.content).toHaveLength(1);
    expect(oldAssistant.content[0]!.type).toBe("text");

    const recentAssistant = result[4] as { content: { type: string }[] };
    expect(recentAssistant.content).toHaveLength(2);
    expect(recentAssistant.content[0]!.type).toBe("text");
    expect(recentAssistant.content[1]!.type).toBe("tool-call");
  });

  it("removes tool-result parts from old tool messages", () => {
    const messages: ModelMessage[] = [
      createModelUserMessage("First"),
      createModelAssistantWithToolCall("Old tool call", "tc1", "OldTool"),
      createModelToolMessage("tc1", "OldTool"),
      createModelUserMessage("Second"),
      createModelAssistantWithToolCall("Recent tool call", "tc2", "RecentTool"),
      createModelToolMessage("tc2", "RecentTool"),
    ];
    const result = trimOldToolCalls(messages, 3);

    const oldToolMsg = result[2] as { content: { type: string }[] };
    expect(oldToolMsg.content).toHaveLength(0);

    const recentToolMsg = result[5] as { content: { type: string }[] };
    expect(recentToolMsg.content).toHaveLength(1);
    expect(recentToolMsg.content[0]!.type).toBe("tool-result");
  });

  it("preserves user messages unchanged", () => {
    const messages: ModelMessage[] = [
      createModelUserMessage("First question"),
      createModelAssistantWithToolCall("Response", "tc1", "Tool"),
      createModelToolMessage("tc1", "Tool"),
      createModelUserMessage("Second question"),
      createModelAssistantMessage("Final response"),
    ];
    const result = trimOldToolCalls(messages, 2);

    const firstUser = result[0] as { content: { type: string; text?: string }[] };
    expect(firstUser.content).toHaveLength(1);
    expect(firstUser.content[0]!.type).toBe("text");
    expect(firstUser.content[0]!.text).toBe("First question");
  });

  it("preserves text content in assistant messages while removing tool calls", () => {
    const messages: ModelMessage[] = [
      createModelUserMessage("Question"),
      createModelAssistantWithToolCall("I will use a tool now", "tc1", "Tool"),
      createModelToolMessage("tc1", "Tool"),
      createModelUserMessage("Follow up"),
      createModelAssistantMessage("Done"),
    ];
    const result = trimOldToolCalls(messages, 2);

    const oldAssistant = result[1] as { content: { type: string; text?: string }[] };
    expect(oldAssistant.content).toHaveLength(1);
    expect(oldAssistant.content[0]!.type).toBe("text");
    expect(oldAssistant.content[0]!.text).toBe("I will use a tool now");
  });

  it("handles empty messages array", () => {
    const result = trimOldToolCalls([], 5);
    expect(result).toEqual([]);
  });

  it("handles messages with only text content", () => {
    const messages: ModelMessage[] = [
      createModelUserMessage("Hello"),
      createModelAssistantMessage("Hi there"),
      createModelUserMessage("How are you?"),
      createModelAssistantMessage("I am fine"),
    ];
    const result = trimOldToolCalls(messages, 2);
    expect(result).toEqual(messages);
  });

  it("removes orphaned tool results in recent messages when their tool call was removed", () => {
    const messages: ModelMessage[] = [
      createModelUserMessage("First"),
      createModelAssistantWithToolCall("Old tool call", "tc1", "OldTool"),
      createModelUserMessage("Second"),
      createModelToolMessage("tc1", "OldTool"),
      createModelAssistantMessage("Done"),
    ];
    const result = trimOldToolCalls(messages, 3);

    const oldAssistant = result[1] as { content: { type: string }[] };
    expect(oldAssistant.content).toHaveLength(1);
    expect(oldAssistant.content[0]!.type).toBe("text");

    const toolMsg = result[3] as { content: { type: string }[] };
    expect(toolMsg.content).toHaveLength(0);
  });

  it("preserves tool results when their tool call is in recent messages", () => {
    const messages: ModelMessage[] = [
      createModelUserMessage("First"),
      createModelAssistantMessage("Text only"),
      createModelUserMessage("Second"),
      createModelAssistantWithToolCall("Recent tool call", "tc1", "Tool"),
      createModelToolMessage("tc1", "Tool"),
    ];
    const result = trimOldToolCalls(messages, 3);

    const recentAssistant = result[3] as { content: { type: string }[] };
    expect(recentAssistant.content).toHaveLength(2);

    const toolMsg = result[4] as { content: { type: string }[] };
    expect(toolMsg.content).toHaveLength(1);
    expect(toolMsg.content[0]!.type).toBe("tool-result");
  });
});

describe("stripUnfinishedToolCalls", () => {
  it("removes tool parts without finished state", () => {
    const messages = [
      createUserMessage("Hello"),
      createAssistantMessageWithToolState("input-available"),
    ];

    const result = stripUnfinishedToolCalls(messages);
    const assistant = result[1]!;

    expect(assistant.parts).toHaveLength(1);
    expect(assistant.parts[0]!.type).toBe("text");
  });

  it("preserves finished tool parts", () => {
    const messages = [
      createUserMessage("Hello"),
      createAssistantMessageWithToolState("output-available"),
    ];

    const result = stripUnfinishedToolCalls(messages);
    const assistant = result[1]!;

    expect(assistant.parts).toHaveLength(2);
    expect(assistant.parts[1]!.type).toBe("tool-invocation");
  });

  it("returns original array when no changes are needed", () => {
    const messages = [createUserMessage("Hello"), createAssistantMessageWithToolState("result")];

    const result = stripUnfinishedToolCalls(messages);
    expect(result).toBe(messages);
  });
});
