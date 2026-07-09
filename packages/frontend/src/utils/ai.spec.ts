import { type Model, ModelProvider } from "shared";
import { describe, expect, it } from "vitest";

import { supportsExtraHighReasoning } from "./ai";

const createModel = (provider: Model["provider"], id: string): Model => ({
  id,
  name: id,
  provider,
  capabilities: {
    reasoning: true,
  },
});

describe("supportsExtraHighReasoning", () => {
  it.each([
    [ModelProvider.OpenAI, "gpt-5.6-luna", true],
    [ModelProvider.OpenRouter, "openai/gpt-5.6-luna", true],
    [ModelProvider.OpenRouter, "anthropic/claude-opus-4.8", false],
    [ModelProvider.Anthropic, "claude-opus-4-8", false],
  ])("identifies OpenAI models", (provider, id, expected) => {
    expect(supportsExtraHighReasoning(createModel(provider, id))).toBe(expected);
  });
});
