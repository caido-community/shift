import { type Model, ModelProvider, type ModelUsageType } from "shared";

const OpenRouterModelIds = {
  CLAUDE_OPUS_4_5: "anthropic/claude-opus-4.5",
  CLAUDE_OPUS_4_5_THINKING: "anthropic/claude-opus-4.5:thinking",
  CLAUDE_OPUS_4_6: "anthropic/claude-opus-4.6",
  CLAUDE_SONNET_4_5: "anthropic/claude-sonnet-4.5",
  CLAUDE_SONNET_4_5_THINKING: "anthropic/claude-sonnet-4.5:thinking",
  DEEPSEEK_V3_2: "deepseek/deepseek-v3.2",
  GEMINI_3_FLASH_PREVIEW: "google/gemini-3-flash-preview",
  GEMINI_3_FLASH_PREVIEW_THINKING: "google/gemini-3-flash-preview:thinking",
  GEMINI_3_PRO_PREVIEW: "google/gemini-3-pro-preview",
  GPT_5_2: "openai/gpt-5.2",
  GPT_5_1: "openai/gpt-5.1",
  GPT_4_1: "openai/gpt-4.1",
  GROK_4_1_FAST: "x-ai/grok-4.1-fast",
  MINIMAX_M2_1: "minimax/minimax-m2.1",
  GLM_4_7: "z-ai/glm-4.7",
  KIMI_K2_5: "moonshotai/kimi-k2.5",
} as const;

export const openrouterModels: Model[] = [
  {
    id: OpenRouterModelIds.CLAUDE_OPUS_4_5,
    name: "Opus 4.5",
    provider: ModelProvider.OpenRouter,
    capabilities: {
      reasoning: false,
    },
  },
  {
    id: OpenRouterModelIds.CLAUDE_OPUS_4_5_THINKING,
    name: "Opus 4.5 Thinking",
    provider: ModelProvider.OpenRouter,
    capabilities: {
      reasoning: true,
    },
  },
  {
    id: OpenRouterModelIds.CLAUDE_OPUS_4_6,
    name: "Opus 4.6",
    provider: ModelProvider.OpenRouter,
    capabilities: {
      reasoning: true,
    },
  },
  {
    id: OpenRouterModelIds.CLAUDE_SONNET_4_5,
    name: "Sonnet 4.5",
    provider: ModelProvider.OpenRouter,
    capabilities: {
      reasoning: false,
    },
  },
  {
    id: OpenRouterModelIds.CLAUDE_SONNET_4_5_THINKING,
    name: "Sonnet 4.5 Thinking",
    provider: ModelProvider.OpenRouter,
    capabilities: {
      reasoning: true,
    },
  },
  {
    id: OpenRouterModelIds.GEMINI_3_FLASH_PREVIEW,
    name: "Gemini 3 Flash",
    provider: ModelProvider.OpenRouter,
    capabilities: {
      reasoning: true,
    },
  },
  {
    id: OpenRouterModelIds.GEMINI_3_PRO_PREVIEW,
    name: "Gemini 3 Pro",
    provider: ModelProvider.OpenRouter,
    capabilities: {
      reasoning: true,
    },
  },
  {
    id: OpenRouterModelIds.GPT_5_2,
    name: "GPT 5.2",
    provider: ModelProvider.OpenRouter,
    capabilities: {
      reasoning: true,
    },
  },
  {
    id: OpenRouterModelIds.GPT_5_1,
    name: "GPT 5.1",
    provider: ModelProvider.OpenRouter,
    capabilities: {
      reasoning: true,
    },
  },
  {
    id: OpenRouterModelIds.GPT_4_1,
    name: "GPT 4.1",
    provider: ModelProvider.OpenRouter,
    capabilities: {
      reasoning: false,
    },
  },
  {
    id: OpenRouterModelIds.GROK_4_1_FAST,
    name: "Grok 4.1 Fast",
    provider: ModelProvider.OpenRouter,
    capabilities: {
      reasoning: true,
    },
  },
  {
    id: OpenRouterModelIds.MINIMAX_M2_1,
    name: "Minimax M2.1",
    provider: ModelProvider.OpenRouter,
    capabilities: {
      reasoning: true,
    },
  },
  {
    id: OpenRouterModelIds.GLM_4_7,
    name: "GLM 4.7",
    provider: ModelProvider.OpenRouter,
    capabilities: {
      reasoning: true,
    },
  },
  {
    id: OpenRouterModelIds.KIMI_K2_5,
    name: "Kimi K2.5",
    provider: ModelProvider.OpenRouter,
    capabilities: {
      reasoning: true,
    },
  },
  {
    id: OpenRouterModelIds.DEEPSEEK_V3_2,
    name: "DeepSeek V3.2",
    provider: ModelProvider.OpenRouter,
    capabilities: {
      reasoning: true,
    },
  },
];

export const defaultOpenRouterModelsConfig: Record<string, ModelUsageType[]> = {
  [OpenRouterModelIds.CLAUDE_OPUS_4_5]: ["agent", "float"],
  [OpenRouterModelIds.CLAUDE_OPUS_4_5_THINKING]: ["agent", "float"],
  [OpenRouterModelIds.CLAUDE_OPUS_4_6]: ["agent", "float"],
  [OpenRouterModelIds.DEEPSEEK_V3_2]: ["agent", "float"],
  [OpenRouterModelIds.CLAUDE_SONNET_4_5]: ["agent", "float"],
  [OpenRouterModelIds.CLAUDE_SONNET_4_5_THINKING]: ["agent", "float"],
  [OpenRouterModelIds.GPT_5_2]: ["agent", "float"],
  [OpenRouterModelIds.GPT_5_1]: ["agent", "float"],
  [OpenRouterModelIds.GPT_4_1]: ["agent", "float"],
  [OpenRouterModelIds.GROK_4_1_FAST]: ["agent", "float"],
  [OpenRouterModelIds.GEMINI_3_FLASH_PREVIEW]: ["agent", "float"],
  [OpenRouterModelIds.GEMINI_3_FLASH_PREVIEW_THINKING]: ["agent", "float"],
  [OpenRouterModelIds.GEMINI_3_PRO_PREVIEW]: ["agent", "float"],
  [OpenRouterModelIds.MINIMAX_M2_1]: ["agent", "float"],
  [OpenRouterModelIds.GLM_4_7]: ["agent", "float"],
  [OpenRouterModelIds.KIMI_K2_5]: ["agent", "float"],
};
