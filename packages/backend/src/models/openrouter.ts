import { type Model, ModelProvider, type ModelUsageType } from "shared";

const OpenRouterModelIds = {
  GPT_5_4: "openai/gpt-5.4",
  GPT_5_3_CODEX: "openai/gpt-5.3-codex",
  CLAUDE_OPUS_4_6: "anthropic/claude-opus-4.6",
  CLAUDE_OPUS_4_6_THINKING: "anthropic/claude-opus-4.6:thinking",
  CLAUDE_SONNET_4_6: "anthropic/claude-sonnet-4.6",
  CLAUDE_SONNET_4_6_THINKING: "anthropic/claude-sonnet-4.6:thinking",
  GEMINI_3_FLASH_PREVIEW: "google/gemini-3-flash-preview",
  GEMINI_3_FLASH_PREVIEW_THINKING: "google/gemini-3-flash-preview:thinking",
  GEMINI_3_1_PRO_PREVIEW_CUSTOMTOOLS: "google/gemini-3.1-pro-preview-customtools",
  GROK_4_1_FAST: "x-ai/grok-4.1-fast",
  MERCURY_2: "inception/mercury-2",
} as const;

export const openrouterModels: Model[] = [
  {
    id: OpenRouterModelIds.GPT_5_4,
    name: "GPT 5.4",
    provider: ModelProvider.OpenRouter,
    capabilities: {
      reasoning: true,
    },
  },
  {
    id: OpenRouterModelIds.GPT_5_3_CODEX,
    name: "GPT 5.3 Codex",
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
      reasoning: false,
    },
  },
  {
    id: OpenRouterModelIds.CLAUDE_OPUS_4_6_THINKING,
    name: "Opus 4.6 Thinking",
    provider: ModelProvider.OpenRouter,
    capabilities: {
      reasoning: true,
    },
  },
  {
    id: OpenRouterModelIds.CLAUDE_SONNET_4_6,
    name: "Sonnet 4.6",
    provider: ModelProvider.OpenRouter,
    capabilities: {
      reasoning: false,
    },
  },
  {
    id: OpenRouterModelIds.CLAUDE_SONNET_4_6_THINKING,
    name: "Sonnet 4.6 Thinking",
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
    id: OpenRouterModelIds.GEMINI_3_1_PRO_PREVIEW_CUSTOMTOOLS,
    name: "Gemini 3.1 Pro",
    provider: ModelProvider.OpenRouter,
    capabilities: {
      reasoning: true,
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
    id: OpenRouterModelIds.MERCURY_2,
    name: "Mercury 2",
    provider: ModelProvider.OpenRouter,
    capabilities: {
      reasoning: true,
    },
  },
];

export const defaultOpenRouterModelsConfig: Record<string, ModelUsageType[]> = {
  [OpenRouterModelIds.GPT_5_4]: ["agent", "float"],
  [OpenRouterModelIds.GPT_5_3_CODEX]: ["agent", "float"],
  [OpenRouterModelIds.CLAUDE_OPUS_4_6]: ["agent", "float"],
  [OpenRouterModelIds.CLAUDE_OPUS_4_6_THINKING]: ["agent", "float"],
  [OpenRouterModelIds.CLAUDE_SONNET_4_6]: ["agent", "float"],
  [OpenRouterModelIds.CLAUDE_SONNET_4_6_THINKING]: ["agent", "float"],
  [OpenRouterModelIds.GEMINI_3_FLASH_PREVIEW]: ["agent", "float"],
  [OpenRouterModelIds.GEMINI_3_1_PRO_PREVIEW_CUSTOMTOOLS]: ["agent", "float"],
  [OpenRouterModelIds.GROK_4_1_FAST]: ["agent", "float"],
  [OpenRouterModelIds.MERCURY_2]: ["agent", "float"],
};
