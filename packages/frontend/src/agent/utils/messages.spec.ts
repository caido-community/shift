import { Result, type ShiftMessage } from "shared";
import { describe, expect, it } from "vitest";

import {
  extractLastUserMessageText,
  findLastUserMessageId,
  findLastUserMessageIndex,
  hasToolPartsSinceIndex,
  hasToolPartsSinceLastUserMessage,
  replaceHistoricalToolOutputsWithBlobRefs,
  serializeToolOutput,
  stripReasoningParts,
  stripUnfinishedToolCalls,
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

function createAssistantMessageWithToolOutput(
  output: unknown,
  state: "output-available" | "result" | "error" = "result",
  id = "a1"
): ShiftMessage {
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
        output,
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

describe("serializeToolOutput", () => {
  it("returns empty string for undefined", () => {
    expect(serializeToolOutput(undefined)).toBe("");
  });

  it("returns empty string for null", () => {
    expect(serializeToolOutput(null)).toBe("");
  });

  it("returns string as-is", () => {
    expect(serializeToolOutput("hello")).toBe("hello");
  });

  it("serializes plain objects to JSON", () => {
    expect(serializeToolOutput({ a: 1, b: "x" })).toBe('{"a":1,"b":"x"}');
  });

  it("serializes Result.Ok to JSON", () => {
    expect(serializeToolOutput(Result.ok({ message: "done" }))).toContain('"kind":"Ok"');
  });

  it("serializes Result.Error to JSON", () => {
    expect(serializeToolOutput(Result.err("failed"))).toContain('"kind":"Error"');
  });
});

describe("replaceHistoricalToolOutputsWithBlobRefs", () => {
  it("returns messages unchanged when no last user message", () => {
    const messages = [createAssistantMessage()];
    const createBlob = () => ({ blobId: "blob-1" });
    expect(replaceHistoricalToolOutputsWithBlobRefs(messages, createBlob)).toBe(messages);
  });

  it("returns messages unchanged when last user message has no prior assistant with tool output", () => {
    const messages = [createUserMessage("Hi"), createAssistantMessage()];
    const createBlob = () => ({ blobId: "blob-1" });
    expect(replaceHistoricalToolOutputsWithBlobRefs(messages, createBlob)).toEqual(messages);
  });

  it("does not replace tool outputs in the current turn", () => {
    const largeOutput = "x".repeat(600);
    const messages = [
      createUserMessage("First"),
      createAssistantMessageWithToolOutput("small"),
      createUserMessage("Second"),
      createAssistantMessageWithToolOutput(largeOutput),
    ];
    const blobs: string[] = [];
    const createBlob = (content: string) => {
      blobs.push(content);
      return { blobId: `blob-${blobs.length}` };
    };
    const result = replaceHistoricalToolOutputsWithBlobRefs(messages, createBlob);
    expect(blobs).toHaveLength(0);
    const currentTurnAssistant = result[3]!;
    const toolPart = currentTurnAssistant.parts.find((p) => p.type === "tool-invocation");
    expect((toolPart as { output?: string })?.output).toBe(largeOutput);
  });

  it("replaces large tool outputs in previous turns with blob placeholder", () => {
    const largeOutput = "x".repeat(600);
    const messages = [
      createUserMessage("First"),
      createAssistantMessageWithToolOutput(largeOutput),
      createUserMessage("Second"),
      createAssistantMessage("a2"),
    ];
    const blobs: string[] = [];
    const createBlob = (content: string) => {
      blobs.push(content);
      return { blobId: `blob-${blobs.length}` };
    };
    const result = replaceHistoricalToolOutputsWithBlobRefs(messages, createBlob);
    expect(blobs).toHaveLength(1);
    expect(blobs[0]).toBe(largeOutput);
    const oldAssistant = result[1]!;
    const toolPart = oldAssistant.parts.find((p) => p.type === "tool-invocation");
    expect((toolPart as { output?: string })?.output).toContain("Read output from blob ID blob-1");
    expect((toolPart as { output?: string })?.output).toContain("PayloadBlobRangeRead");
  });

  it("preserves assistant text content", () => {
    const largeOutput = "x".repeat(600);
    const messages = [
      createUserMessage("First"),
      createAssistantMessageWithToolOutput(largeOutput),
      createUserMessage("Second"),
    ];
    const createBlob = () => ({ blobId: "blob-1" });
    const result = replaceHistoricalToolOutputsWithBlobRefs(messages, createBlob);
    const assistant = result[1]!;
    const textPart = assistant.parts.find((p) => p.type === "text");
    expect((textPart as { text?: string })?.text).toBe("Using tool");
  });

  it("does not replace outputs below threshold", () => {
    const smallOutput = "ok";
    const messages = [
      createUserMessage("First"),
      createAssistantMessageWithToolOutput(smallOutput),
      createUserMessage("Second"),
    ];
    const createBlob = () => ({ blobId: "blob-1" });
    const result = replaceHistoricalToolOutputsWithBlobRefs(messages, createBlob);
    const assistant = result[1]!;
    const toolPart = assistant.parts.find((p) => p.type === "tool-invocation");
    expect((toolPart as { output?: string })?.output).toBe(smallOutput);
  });

  it("respects custom minOutputLengthToReplace threshold", () => {
    const output = "x".repeat(100);
    const messages = [
      createUserMessage("First"),
      createAssistantMessageWithToolOutput(output),
      createUserMessage("Second"),
    ];
    const createBlob = () => ({ blobId: "blob-1" });
    const result = replaceHistoricalToolOutputsWithBlobRefs(messages, createBlob, {
      minOutputLengthToReplace: 50,
    });
    const assistant = result[1]!;
    const toolPart = assistant.parts.find((p) => p.type === "tool-invocation");
    expect((toolPart as { output?: string })?.output).toContain("Read output from blob ID");
  });

  it("does not mutate input messages", () => {
    const largeOutput = "x".repeat(600);
    const messages = [
      createUserMessage("First"),
      createAssistantMessageWithToolOutput(largeOutput),
      createUserMessage("Second"),
    ];
    const original = JSON.stringify(messages);
    replaceHistoricalToolOutputsWithBlobRefs(messages, () => ({ blobId: "blob-1" }));
    expect(JSON.stringify(messages)).toBe(original);
  });
});

describe("stripReasoningParts", () => {
  it("removes assistant reasoning-only messages", () => {
    const messages: ShiftMessage[] = [
      { id: "u1", role: "user", parts: [{ type: "text", text: "hello" }] } as ShiftMessage,
      {
        id: "a1",
        role: "assistant",
        parts: [{ type: "reasoning", text: "internal", state: "done" }],
      } as ShiftMessage,
    ];

    const result = stripReasoningParts(messages);

    expect(result).toHaveLength(1);
    expect(result[0]?.role).toBe("user");
  });

  it("preserves non-reasoning assistant parts", () => {
    const messages: ShiftMessage[] = [
      {
        id: "a1",
        role: "assistant",
        parts: [
          { type: "reasoning", text: "internal", state: "done" },
          { type: "text", text: "visible" },
        ],
      } as ShiftMessage,
    ];

    const result = stripReasoningParts(messages);

    expect(result).toHaveLength(1);
    expect(result[0]?.parts).toEqual([{ type: "text", text: "visible" }]);
  });
});
