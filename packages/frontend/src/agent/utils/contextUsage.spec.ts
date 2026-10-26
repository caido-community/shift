import type { Model, ShiftMessage } from "shared";
import { describe, expect, it } from "vitest";

import {
  estimateMessagesCharacters,
  getCacheHitRate,
  getEstimatedContextUsage,
} from "./contextUsage";

import { estimateTokensFromCharacters } from "@/agent/compaction";

function createModel(id: string, name: string, contextWindow?: number): Model {
  return {
    id,
    name,
    provider: "openai",
    contextWindow,
    capabilities: {
      reasoning: true,
    },
  };
}

describe("estimateMessagesCharacters", () => {
  it("counts user, reasoning, and tool data", () => {
    const messages = [
      {
        id: "u1",
        role: "user",
        parts: [{ type: "text", text: "hello" }],
      },
      {
        id: "a1",
        role: "assistant",
        parts: [
          { type: "reasoning", text: "thinking", state: "done" },
          {
            type: "tool-invocation",
            toolCallId: "tool-1",
            toolName: "RequestSend",
            input: { url: "/test", method: "GET" },
            output: { status: 200, body: "ok" },
            state: "output-available",
          },
        ],
      },
    ] as ShiftMessage[];

    expect(estimateMessagesCharacters(messages)).toBe(
      "user".length +
        JSON.stringify(messages[0]?.parts)?.length +
        "assistant".length +
        JSON.stringify(messages[1]?.parts)?.length
    );
  });
});

describe("estimateTokensFromCharacters", () => {
  it("uses the 4 chars per token heuristic", () => {
    expect(estimateTokensFromCharacters(0)).toBe(0);
    expect(estimateTokensFromCharacters(1)).toBe(1);
    expect(estimateTokensFromCharacters(4)).toBe(1);
    expect(estimateTokensFromCharacters(5)).toBe(2);
  });
});

describe("getEstimatedContextUsage", () => {
  it("measures against the compaction threshold", () => {
    const result = getEstimatedContextUsage({
      model: createModel("gpt-6-sol", "GPT 6 Sol", 1_000_000),
      systemPrompt: "a".repeat(400),
      skillsPrompt: "",
      toolsCharacters: 0,
      messages: [],
    });

    expect(result.contextWindowTokens).toBe(272_000);
    expect(result.availableTokens).toBe(240_000);
    expect(result.usedTokens).toBe(100);
    expect(result.percentage).toBeCloseTo((100 / 240_000) * 100);
  });

  it("compacts earlier on small context windows", () => {
    const result = getEstimatedContextUsage({
      model: createModel("mercury-2", "Mercury 2", 128_000),
      systemPrompt: "",
      skillsPrompt: "",
      toolsCharacters: 0,
      messages: [],
    });

    expect(result.availableTokens).toBe(96_000);
  });

  it("falls back to the default window when the model is unknown", () => {
    const result = getEstimatedContextUsage({
      model: createModel("custom-model", "Custom Model"),
      systemPrompt: "",
      skillsPrompt: "",
      toolsCharacters: 0,
      messages: [],
    });

    expect(result.availableTokens).toBe(168_000);
  });

  it("supports different configured context windows", () => {
    const mercury = getEstimatedContextUsage({
      model: createModel("mercury-2", "Mercury 2", 128_000),
      systemPrompt: "",
      skillsPrompt: "",
      toolsCharacters: 0,
      messages: [],
    });
    const grok = getEstimatedContextUsage({
      model: createModel("grok-4.1-fast", "Grok 4.1 Fast", 2_000_000),
      systemPrompt: "",
      skillsPrompt: "",
      toolsCharacters: 0,
      messages: [],
    });

    expect(mercury.availableTokens).toBe(96_000);
    expect(grok.availableTokens).toBe(240_000);
  });

  it("ignores messages replaced by a compaction summary", () => {
    const messages: ShiftMessage[] = [
      { id: "u1", role: "user", parts: [{ type: "text", text: "y".repeat(400_000) }] },
      {
        id: "a1",
        role: "assistant",
        parts: [{ type: "data-compaction", data: { summary: "s".repeat(400) } }],
      },
    ];

    const result = getEstimatedContextUsage({
      model: createModel("gpt-6-sol", "GPT 6 Sol", 1_000_000),
      systemPrompt: "",
      skillsPrompt: "",
      toolsCharacters: 0,
      messages,
    });

    expect(result.usedTokens).toBe(100);
    expect(result.segments.map((segment) => segment.label)).toEqual(["Summary"]);
  });

  it("uses the measured context size plus messages added after it", () => {
    const messages: ShiftMessage[] = [
      { id: "u1", role: "user", parts: [{ type: "text", text: "a".repeat(400_000) }] },
      { id: "a1", role: "assistant", parts: [], metadata: { contextTokens: 50_000 } },
      { id: "u2", role: "user", parts: [{ type: "text", text: "b".repeat(396) }] },
    ];

    const result = getEstimatedContextUsage({
      model: createModel("gpt-6-sol", "GPT 6 Sol", 1_000_000),
      systemPrompt: "",
      skillsPrompt: "",
      toolsCharacters: 0,
      messages,
    });

    expect(result.usedTokens).toBe(
      50_000 + estimateTokensFromCharacters(estimateMessagesCharacters([messages[2]!]))
    );
  });
});

describe("context segments", () => {
  it("splits skills out of the system prompt and groups messages into turns", () => {
    const messages = [
      { id: "u1", role: "user", parts: [{ type: "text", text: "a".repeat(400) }] },
      { id: "a1", role: "assistant", parts: [{ type: "text", text: "b".repeat(400) }] },
      { id: "u2", role: "user", parts: [{ type: "text", text: "c".repeat(400) }] },
    ] as ShiftMessage[];

    const result = getEstimatedContextUsage({
      model: createModel("m", "M", 200_000),
      systemPrompt: "s".repeat(800),
      skillsPrompt: "k".repeat(400),
      toolsCharacters: 4000,
      messages,
    });

    expect(result.segments.map((segment) => [segment.kind, segment.label])).toEqual([
      ["system", "System prompt"],
      ["tools", "Tools"],
      ["skills", "Skills"],
      ["turn", "Turn 1"],
      ["latest", "Latest turn"],
    ]);
    expect(result.segments[0]?.tokens).toBe(100);
    expect(result.segments[1]?.tokens).toBe(1000);
    expect(result.usedTokens).toBe(
      result.segments.reduce((total, segment) => total + segment.tokens, 0)
    );
  });
});

describe("getCacheHitRate", () => {
  it("averages over all reported usage and skips providers without cache data", () => {
    const withUsage = (inputTokens?: number, cacheReadTokens?: number) =>
      ({
        id: "a",
        role: "assistant",
        parts: [],
        metadata: { usage: { inputTokens, cacheReadTokens } },
      }) as ShiftMessage;

    expect(getCacheHitRate([withUsage(1000, 100), withUsage(3000, 2900)])).toBe(75);
    expect(getCacheHitRate([withUsage(1000, 500), withUsage(9000, undefined)])).toBe(50);
    expect(getCacheHitRate([withUsage(1000, undefined)])).toBeUndefined();
    expect(getCacheHitRate([])).toBeUndefined();
  });
});
