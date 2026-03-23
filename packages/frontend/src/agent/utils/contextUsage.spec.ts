import type { Model, ShiftMessage } from "shared";
import { describe, expect, it } from "vitest";

import {
  estimateMessagesCharacters,
  estimateTokensFromCharacters,
  formatContextUsageLabel,
  getEstimatedContextUsage,
} from "./contextUsage";

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
  it("uses the model context window with the safety buffer", () => {
    const result = getEstimatedContextUsage({
      model: createModel("gpt-5.4", "GPT 5.4", 1_000_000),
      systemPrompt: "a".repeat(400),
      messages: [],
    });

    expect(result.availableTokens).toBe(980_000);
    expect(result.usedTokens).toBe(100);
    expect(result.percentage).toBeCloseTo((100 / 980_000) * 100);
  });

  it("uses the provided smaller model context window", () => {
    const result = getEstimatedContextUsage({
      model: createModel("gpt-5.4-mini", "GPT 5.4 Mini", 400_000),
      systemPrompt: "",
      messages: [],
    });

    expect(result.availableTokens).toBe(380_000);
  });

  it("falls back to the default safe window when the model is unknown", () => {
    const result = getEstimatedContextUsage({
      model: createModel("custom-model", "Custom Model"),
      systemPrompt: "",
      messages: [],
    });

    expect(result.availableTokens).toBe(180_000);
  });

  it("supports different configured context windows", () => {
    const mercury = getEstimatedContextUsage({
      model: createModel("mercury-2", "Mercury 2", 128_000),
      systemPrompt: "",
      messages: [],
    });
    const grok = getEstimatedContextUsage({
      model: createModel("grok-4.1-fast", "Grok 4.1 Fast", 2_000_000),
      systemPrompt: "",
      messages: [],
    });

    expect(mercury.availableTokens).toBe(108_000);
    expect(grok.availableTokens).toBe(1_980_000);
  });
});

describe("formatContextUsageLabel", () => {
  it("rounds to a whole percent", () => {
    expect(formatContextUsageLabel(29.6)).toBe("30% context used");
  });
});
