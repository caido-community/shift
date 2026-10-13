import type { ModelMessage, StepResult, ToolSet } from "ai";
import { MockLanguageModelV3, simulateReadableStream } from "ai/test";
import type { ShiftMessage } from "shared";
import { describe, expect, it, vi } from "vitest";

import { applyCompactionMarker, buildSummaryMessage, createCompactor } from "./compaction";

const summaryModel = () =>
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
              finishReason: { unified: "stop", raw: "stop" },
              usage: {
                inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
                outputTokens: { total: 1, text: 1, reasoning: 0 },
              },
            },
          ],
        }),
      }),
  });

const stepWithInputTokens = (inputTokens: number) =>
  ({ usage: { inputTokens, outputTokens: 0 } }) as unknown as StepResult<ToolSet>;

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
});
