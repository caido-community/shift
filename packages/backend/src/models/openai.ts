import { type Model, ModelProvider, type ModelUsageType } from "shared";

const OpenAIModelIds = {
  GPT_5_4: "gpt-5.4",
  GPT_5_4_MINI: "gpt-5.4-mini",
  GPT_5_4_NANO: "gpt-5.4-nano",
  GPT_5_3_CODEX: "gpt-5.3-codex",
} as const;

export const openaiModels: Model[] = [
  {
    id: OpenAIModelIds.GPT_5_4,
    name: "GPT 5.4",
    provider: ModelProvider.OpenAI,
    contextWindow: 1_000_000,
    capabilities: {
      reasoning: true,
    },
  },
  {
    id: OpenAIModelIds.GPT_5_4_MINI,
    name: "GPT 5.4 Mini",
    provider: ModelProvider.OpenAI,
    contextWindow: 400_000,
    capabilities: {
      reasoning: true,
    },
  },
  {
    id: OpenAIModelIds.GPT_5_4_NANO,
    name: "GPT 5.4 Nano",
    provider: ModelProvider.OpenAI,
    contextWindow: 400_000,
    capabilities: {
      reasoning: true,
    },
  },
  {
    id: OpenAIModelIds.GPT_5_3_CODEX,
    name: "GPT 5.3 Codex",
    provider: ModelProvider.OpenAI,
    capabilities: {
      reasoning: true,
    },
  },
];

export const defaultOpenAIModelsConfig: Record<string, ModelUsageType[]> = {
  [OpenAIModelIds.GPT_5_4]: ["agent", "float"],
  [OpenAIModelIds.GPT_5_4_MINI]: ["agent", "float"],
  [OpenAIModelIds.GPT_5_4_NANO]: ["agent", "float"],
  [OpenAIModelIds.GPT_5_3_CODEX]: ["agent", "float"],
};
