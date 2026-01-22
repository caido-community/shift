import { type Model, ModelProvider, type ModelUsageType } from "shared";

const AnthropicModelIds = {
  CLAUDE_OPUS_4_5: "claude-opus-4-5-20251101",
  CLAUDE_SONNET_4_5: "claude-sonnet-4-5-20250929",
  CLAUDE_HAIKU_4_5: "claude-haiku-4-5-20251001",
  CLAUDE_OPUS_4_1: "claude-opus-4-1-20250805",
  CLAUDE_SONNET_4: "claude-sonnet-4-20250514",
  CLAUDE_OPUS_4: "claude-opus-4-20250514",
} as const;

export const anthropicModels: Model[] = [
  {
    id: AnthropicModelIds.CLAUDE_OPUS_4_5,
    name: "Opus 4.5",
    provider: ModelProvider.Anthropic,
    capabilities: {
      reasoning: true,
    },
  },
  {
    id: AnthropicModelIds.CLAUDE_SONNET_4_5,
    name: "Sonnet 4.5",
    provider: ModelProvider.Anthropic,
    capabilities: {
      reasoning: true,
    },
  },
  {
    id: AnthropicModelIds.CLAUDE_HAIKU_4_5,
    name: "Haiku 4.5",
    provider: ModelProvider.Anthropic,
    capabilities: {
      reasoning: true,
    },
  },
  {
    id: AnthropicModelIds.CLAUDE_OPUS_4_1,
    name: "Opus 4.1",
    provider: ModelProvider.Anthropic,
    capabilities: {
      reasoning: true,
    },
  },
  {
    id: AnthropicModelIds.CLAUDE_SONNET_4,
    name: "Sonnet 4",
    provider: ModelProvider.Anthropic,
    capabilities: {
      reasoning: true,
    },
  },
  {
    id: AnthropicModelIds.CLAUDE_OPUS_4,
    name: "Opus 4",
    provider: ModelProvider.Anthropic,
    capabilities: {
      reasoning: true,
    },
  },
];

export const defaultAnthropicModelsConfig: Record<string, ModelUsageType[]> = {
  [AnthropicModelIds.CLAUDE_OPUS_4_5]: ["agent", "float"],
  [AnthropicModelIds.CLAUDE_SONNET_4_5]: ["agent", "float"],
  [AnthropicModelIds.CLAUDE_HAIKU_4_5]: ["agent", "float"],
  [AnthropicModelIds.CLAUDE_OPUS_4_1]: ["agent", "float"],
  [AnthropicModelIds.CLAUDE_SONNET_4]: ["agent", "float"],
  [AnthropicModelIds.CLAUDE_OPUS_4]: ["agent", "float"],
};
