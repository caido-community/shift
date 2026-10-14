import type { ModelMessage, StepResult, ToolSet } from "ai";
import { MockLanguageModelV3, simulateReadableStream } from "ai/test";
import type { ShiftMessage } from "shared";
import { describe, expect, it, vi } from "vitest";

import {
  applyCompactionMarker,
  buildSummaryMessage,
  createCompactor,
  getCompactionThreshold,
} from "./compaction";

const summaryModel = (finishReason: "stop" | "length" = "stop") =>
  new MockLanguageModelV3({
    doStream: () =>
      Promise.resolve({
        stream: simulateReadableStream({
          chunks: [
            { type: "stream-start", warnings: [] },
            { type: "text-start", id: "t" },
            { type: "text-delta", id: "t", delta: "the summary" },
            { type: "text-end", id: "t" },
            {
              type: "finish",
              finishReason: { unified: finishReason, raw: finishReason },
              usage: {
                inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
                outputTokens: { total: 1, text: 1, reasoning: 0 },
              },
            },
          ],
        }),
      }),
  });

const stepWithInputTokens = (inputTokens: number, responseMessages: ModelMessage[] = []) =>
  ({
    usage: { inputTokens, outputTokens: 0 },
    response: { messages: responseMessages },
  }) as unknown as StepResult<ToolSet>;

describe("applyCompactionMarker", () => {
  it("returns messages unchanged without a marker", () => {
    const messages: ShiftMessage[] = [{ id: "u", role: "user", parts: [] }];
    expect(applyCompactionMarker(messages)).toEqual({ summary: undefined, messages });
  });

  it("keeps only parts after the latest marker", () => {
    const messages: ShiftMessage[] = [
      { id: "u1", role: "user", parts: [{ type: "text", text: "old" }] },
      {
        id: "a1",
        role: "assistant",
        parts: [
          { type: "text", text: "before" },
          { type: "data-compaction", data: { summary: "first" } },
          { type: "text", text: "middle" },
          { type: "data-compaction", data: { summary: "second" } },
          { type: "text", text: "after" },
        ],
      },
      { id: "u2", role: "user", parts: [{ type: "text", text: "next" }] },
    ];

    const result = applyCompactionMarker(messages);

    expect(result.summary).toBe("second");
    expect(result.messages).toEqual([
      { id: "a1", role: "assistant", parts: [{ type: "text", text: "after" }] },
      messages[2],
    ]);
  });
});

describe("createCompactor", () => {
  const messages: ModelMessage[] = [
    { role: "user", content: "task" },
    { role: "assistant", content: "working" },
  ];

  it("leaves messages alone below the threshold", async () => {
    const model = summaryModel();
    const compact = createCompactor({
      model,
      system: "",
      tools: {},
      contextWindow: 1_000_000,
      onCompact: vi.fn(),
    });

    expect(await compact({ messages, steps: [stepWithInputTokens(1_000)] })).toBeUndefined();
    expect(model.doStreamCalls).toHaveLength(0);
  });

  it("summarizes once over the threshold and keeps newer messages after it", async () => {
    const onCompact = vi.fn();
    const compact = createCompactor({
      model: summaryModel(),
      system: "",
      tools: {},
      contextWindow: 1_000_000,
      onCompact,
    });

    const first = await compact({ messages, steps: [stepWithInputTokens(250_000)] });
    expect(onCompact).toHaveBeenCalledWith("the summary");
    expect(first).toEqual({ messages: [buildSummaryMessage("the summary")] });

    const newer: ModelMessage = { role: "assistant", content: "continued" };
    const second = await compact({
      messages: [...messages, newer],
      steps: [stepWithInputTokens(250_000), stepWithInputTokens(5_000)],
    });
    expect(second).toEqual({ messages: [buildSummaryMessage("the summary"), newer] });
    expect(onCompact).toHaveBeenCalledOnce();
  });

  it("counts tool results added after the last step's usage", async () => {
    const onCompact = vi.fn();
    const compact = createCompactor({
      model: summaryModel(),
      system: "",
      tools: {},
      contextWindow: 128_000,
      onCompact,
    });
    const toolResult: ModelMessage = {
      role: "tool",
      content: [
        {
          type: "tool-result",
          toolCallId: "tc1",
          toolName: "Tool",
          output: { type: "text", value: "x".repeat(400_000) },
        },
      ],
    };

    await compact({ messages, steps: [stepWithInputTokens(10_000, [toolResult])] });
    expect(onCompact).toHaveBeenCalledOnce();
  });

  it("keeps history when the summary is cut off", async () => {
    const onCompact = vi.fn();
    const compact = createCompactor({
      model: summaryModel("length"),
      system: "",
      tools: {},
      contextWindow: 1_000_000,
      onCompact,
    });

    expect(await compact({ messages, steps: [stepWithInputTokens(250_000)] })).toBeUndefined();
    expect(onCompact).not.toHaveBeenCalled();
  });
});

describe("getCompactionThreshold", () => {
  it("leaves room for the summary in small context windows", () => {
    expect(getCompactionThreshold(16_000)).toBe(12_000);
    expect(getCompactionThreshold(200_000)).toBe(168_000);
  });
});
