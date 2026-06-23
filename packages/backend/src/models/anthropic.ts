import { type Model, ModelProvider, type ModelUsageType } from "shared";

const AnthropicModelIds = {
  CLAUDE_OPUS_4_8: "claude-opus-4-8",
  CLAUDE_OPUS_4_7: "claude-opus-4-7",
  CLAUDE_OPUS_4_6: "claude-opus-4-6",
  CLAUDE_SONNET_4_6: "claude-sonnet-4-6",
} as const;

export const anthropicModels: Model[] = [
  {
    id: AnthropicModelIds.CLAUDE_OPUS_4_8,
    name: "Opus 4.8",
    provider: ModelProvider.Anthropic,
    contextWindow: 1_000_000,
    capabilities: {
      reasoning: true,
    },
  },
  {
    id: AnthropicModelIds.CLAUDE_OPUS_4_7,
    name: "Opus 4.7",
    provider: ModelProvider.Anthropic,
    contextWindow: 1_000_000,
    capabilities: {
      reasoning: true,
    },
  },
  {
    id: AnthropicModelIds.CLAUDE_OPUS_4_6,
    name: "Opus 4.6",
    provider: ModelProvider.Anthropic,
    contextWindow: 1_000_000,
    capabilities: {
      reasoning: true,
    },
  },
  {
    id: AnthropicModelIds.CLAUDE_SONNET_4_6,
    name: "Sonnet 4.6",
    provider: ModelProvider.Anthropic,
    contextWindow: 1_000_000,
    capabilities: {
      reasoning: true,
    },
  },
];

export const defaultAnthropicModelsConfig: Record<string, ModelUsageType[]> = {
  [AnthropicModelIds.CLAUDE_OPUS_4_8]: ["agent", "float"],
  [AnthropicModelIds.CLAUDE_OPUS_4_7]: ["agent", "float"],
  [AnthropicModelIds.CLAUDE_OPUS_4_6]: ["agent", "float"],
  [AnthropicModelIds.CLAUDE_SONNET_4_6]: ["agent", "float"],
};
