import { type Model, ModelProvider, type ModelUsageType } from "shared";

const BedrockModelIds = {
  CLAUDE_SONNET_4_5: "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
  CLAUDE_HAIKU_4_5: "us.anthropic.claude-haiku-4-5-20251001-v1:0",
  NOVA_PRO: "us.amazon.nova-pro-v1:0",
  NOVA_LITE: "us.amazon.nova-lite-v1:0",
} as const;

export const bedrockModels: Model[] = [
  {
    id: BedrockModelIds.CLAUDE_SONNET_4_5,
    name: "Claude Sonnet 4.5 (Bedrock)",
    provider: ModelProvider.Bedrock,
    contextWindow: 200_000,
    capabilities: {
      reasoning: false,
    },
  },
  {
    id: BedrockModelIds.CLAUDE_HAIKU_4_5,
    name: "Claude Haiku 4.5 (Bedrock)",
    provider: ModelProvider.Bedrock,
    contextWindow: 200_000,
    capabilities: {
      reasoning: false,
    },
  },
  {
    id: BedrockModelIds.NOVA_PRO,
    name: "Amazon Nova Pro (Bedrock)",
    provider: ModelProvider.Bedrock,
    contextWindow: 300_000,
    capabilities: {
      reasoning: false,
    },
  },
  {
    id: BedrockModelIds.NOVA_LITE,
    name: "Amazon Nova Lite (Bedrock)",
    provider: ModelProvider.Bedrock,
    contextWindow: 300_000,
    capabilities: {
      reasoning: false,
    },
  },
];

export const defaultBedrockModelsConfig: Record<string, ModelUsageType[]> = {
  [BedrockModelIds.CLAUDE_SONNET_4_5]: ["agent", "float"],
  [BedrockModelIds.CLAUDE_HAIKU_4_5]: ["agent", "float"],
  [BedrockModelIds.NOVA_PRO]: ["agent", "float"],
  [BedrockModelIds.NOVA_LITE]: ["agent", "float"],
};
