import { type Model, ModelProvider, type ModelUsageType } from "shared";

const OpenAIModelIds = {
  GPT_5_4: "gpt-5.4",
  GPT_5_3_CODEX: "gpt-5.3-codex",
} as const;

export const openaiModels: Model[] = [
  {
    id: OpenAIModelIds.GPT_5_4,
    name: "GPT 5.4",
    provider: ModelProvider.OpenAI,
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
  [OpenAIModelIds.GPT_5_3_CODEX]: ["agent", "float"],
};
