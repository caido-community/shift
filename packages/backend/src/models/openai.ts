import { type Model, ModelProvider, type ModelUsageType } from "shared";

const OpenAIModelIds = {
  GPT_5_2: "gpt-5.2",
  GPT_5_1: "gpt-5.1",
  GPT_5: "gpt-5",
  GPT_5_MINI: "gpt-5-mini",
  GPT_5_NANO: "gpt-5-nano",
  GPT_4_1: "gpt-4.1",
  GPT_4_1_MINI: "gpt-4.1-mini",
  GPT_4_1_NANO: "gpt-4.1-nano",
} as const;

export const openaiModels: Model[] = [
  {
    id: OpenAIModelIds.GPT_5_2,
    name: "GPT 5.2",
    provider: ModelProvider.OpenAI,
    capabilities: {
      reasoning: true,
    },
  },
  {
    id: OpenAIModelIds.GPT_5_1,
    name: "GPT 5.1",
    provider: ModelProvider.OpenAI,
    capabilities: {
      reasoning: true,
    },
  },
  {
    id: OpenAIModelIds.GPT_5,
    name: "GPT 5",
    provider: ModelProvider.OpenAI,
    capabilities: {
      reasoning: true,
    },
  },
  {
    id: OpenAIModelIds.GPT_5_MINI,
    name: "GPT 5 Mini",
    provider: ModelProvider.OpenAI,
    capabilities: {
      reasoning: true,
    },
  },
  {
    id: OpenAIModelIds.GPT_5_NANO,
    name: "GPT 5 Nano",
    provider: ModelProvider.OpenAI,
    capabilities: {
      reasoning: true,
    },
  },
  {
    id: OpenAIModelIds.GPT_4_1,
    name: "GPT 4.1",
    provider: ModelProvider.OpenAI,
    capabilities: {
      reasoning: false,
    },
  },
  {
    id: OpenAIModelIds.GPT_4_1_MINI,
    name: "GPT 4.1 Mini",
    provider: ModelProvider.OpenAI,
    capabilities: {
      reasoning: false,
    },
  },
  {
    id: OpenAIModelIds.GPT_4_1_NANO,
    name: "GPT 4.1 Nano",
    provider: ModelProvider.OpenAI,
    capabilities: {
      reasoning: false,
    },
  },
];

export const defaultOpenAIModelsConfig: Record<string, ModelUsageType[]> = {
  [OpenAIModelIds.GPT_5_2]: ["agent", "float"],
  [OpenAIModelIds.GPT_5_1]: ["agent", "float"],
  [OpenAIModelIds.GPT_5]: ["agent", "float"],
  [OpenAIModelIds.GPT_5_MINI]: ["agent", "float"],
  [OpenAIModelIds.GPT_5_NANO]: ["agent", "float"],
  [OpenAIModelIds.GPT_4_1]: ["agent", "float"],
  [OpenAIModelIds.GPT_4_1_MINI]: ["agent", "float"],
  [OpenAIModelIds.GPT_4_1_NANO]: ["agent", "float"],
};
