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

const step = (inputTokens: number, content: unknown[] = []) =>
  ({ usage: { inputTokens, outputTokens: 0 }, content }) as unknown as StepResult<ToolSet>;

const estimateTokens = (value: unknown) => Math.ceil(JSON.stringify(value).length / 4);

describe("applyCompactionMarker", () => {
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
  const toolResult = (output: string) => ({
    type: "tool-result",
    toolCallId: "tc",
    toolName: "Tool",
    output,
  });

  it("leaves messages alone below the threshold", async () => {
    const model = summaryModel();
    const compactor = createCompactor({
      model,
      system: "",
      tools: {},
      contextWindow: 1_000_000,
      onCompact: vi.fn(),
    });

    compactor.onStepFinish(step(1_000));
    expect(await compactor.prepareStep({ messages })).toBeUndefined();
    expect(model.doStreamCalls).toHaveLength(0);
  });

  it("summarizes once over the threshold and keeps newer messages after it", async () => {
    const onCompact = vi.fn();
    const compactor = createCompactor({
      model: summaryModel(),
      system: "",
      tools: {},
      contextWindow: 1_000_000,
      initialTokens: 250_000,
      onCompact,
    });

    const first = await compactor.prepareStep({ messages });
    expect(onCompact).toHaveBeenCalledWith("the summary");
    expect(first).toEqual({ messages: [buildSummaryMessage("the summary")] });

    const newer: ModelMessage = { role: "assistant", content: "continued" };
    compactor.onStepFinish(step(5_000));
    const second = await compactor.prepareStep({ messages: [...messages, newer] });
    expect(second).toEqual({ messages: [buildSummaryMessage("the summary"), newer] });
    expect(onCompact).toHaveBeenCalledOnce();
  });

  it("adds the step's tool results to the measured input", () => {
    const onMeasure = vi.fn();
    const compactor = createCompactor({
      model: summaryModel(),
      system: "",
      tools: {},
      contextWindow: 1_000_000,
      onCompact: vi.fn(),
      onMeasure,
    });
    const result = toolResult("y".repeat(4_000));

    compactor.onStepFinish(step(120_000, [{ type: "text", text: "done" }, result]));

    expect(onMeasure).toHaveBeenLastCalledWith(120_000 + estimateTokens([result]));
  });

  it("estimates from the messages when the provider reports zero input tokens", async () => {
    const onCompact = vi.fn();
    const compactor = createCompactor({
      model: summaryModel(),
      system: "",
      tools: {},
      contextWindow: 128_000,
      onCompact,
    });
    await compactor.prepareStep({ messages });
    compactor.onStepFinish(step(0, [toolResult("x".repeat(500_000))]));
    await compactor.prepareStep({ messages });
    expect(onCompact).toHaveBeenCalledOnce();
  });

  it("keeps a summary that hit the output limit", async () => {
    const onCompact = vi.fn();
    const compactor = createCompactor({
      model: summaryModel("length"),
      system: "",
      tools: {},
      contextWindow: 1_000_000,
      initialTokens: 250_000,
      onCompact,
    });

    await compactor.prepareStep({ messages });
    expect(onCompact).toHaveBeenCalledWith("the summary");
  });

  it("fails with the cause when the summary request errors", async () => {
    const compactor = createCompactor({
      model: new MockLanguageModelV3({ doStream: () => Promise.reject(new Error("boom")) }),
      system: "",
      tools: {},
      contextWindow: 1_000_000,
      initialTokens: 250_000,
      onCompact: vi.fn(),
    });

    await expect(compactor.prepareStep({ messages })).rejects.toThrow(
      "Context compaction failed: boom"
    );
  });
});

describe("getCompactionThreshold", () => {
  it("leaves room for the summary in small context windows", () => {
    expect(getCompactionThreshold(16_000)).toBe(12_000);
    expect(getCompactionThreshold(200_000)).toBe(168_000);
  });
});
